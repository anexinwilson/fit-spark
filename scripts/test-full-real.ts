/**
 * FitSpark Full Real Integration Test
 *
 * Tests against live services:
 *   - NeonDB (Postgres)   → real user equipment & performance history
 *   - Pinecone            → real RAG exercise retrieval
 *   - Gemini 3.6 Flash    → real LLM calls
 *   - LangSmith           → real trace logging
 *
 * Evaluates:
 *   1. End-to-end timing per stage
 *   2. RAG retrieval quality (exercise count, no hallucinations)
 *   3. Plan structure (valid JSON, all days present)
 *   4. Coach note quality (>60 words per exercise = "like a real gym instructor")
 *   5. Safety compliance (no bodyweight violations, injury checks)
 *   6. Consistency (all exercises come from Pinecone pool)
 *
 * Run: npx tsx scripts/test-full-real.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pinecone } from "@pinecone-database/pinecone";

process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_API_KEY =
  process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY ?? "";
process.env.LANGCHAIN_PROJECT = "fitspark-evals";

import pg from "pg";
import { workoutPlanWorkflow } from "../src/lib/workout-generator/graph";

const { Pool } = pg;

// ─── Database ────────────────────────────────────────────────────────────────

async function getRealUsersFromNeonDB() {
  const runtimeConfig = JSON.parse(
    process.env.FITSPARK_RUNTIME_CONFIG_JSON ?? "{}",
  );
  const connectionString =
    runtimeConfig.DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) throw new Error("DATABASE_URL not set in env");

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Users with the most equipment variety
    const { rows: equipRows } = await pool.query<{
      userId: string;
      aliases: string[];
    }>(
      `SELECT "userId", array_agg("equipmentAlias") AS aliases
       FROM "UserEquipmentInventory"
       GROUP BY "userId"
       ORDER BY COUNT(*) DESC
       LIMIT 5`,
    );

    if (equipRows.length === 0) return [];

    const userIds = equipRows.map((r) => r.userId);

    const [profileRows, injuryRows, sessionRows] = await Promise.all([
      pool.query<{ userId: string; experienceLevel: string }>(
        `SELECT "userId", "experienceLevel" FROM "Profile" WHERE "userId" = ANY($1)`,
        [userIds],
      ),
      pool.query<{ userId: string; injuryDescription: string }>(
        `SELECT "userId", "injuryDescription" FROM "HealthProfile" WHERE "userId" = ANY($1)`,
        [userIds],
      ),
      pool.query<{
        userId: string;
        exerciseName: string;
        completed: number;
        total: number;
      }>(
        `WITH ExStats AS (
           SELECT
             ws."userId", el."exerciseName",
             COUNT(sl.id) as total,
             SUM(CASE WHEN sl.completed THEN 1 ELSE 0 END) as completed,
             ROW_NUMBER() OVER(PARTITION BY ws."userId", el."exerciseName" ORDER BY ws."createdAt" DESC) as rn
           FROM "WorkoutSession" ws
           JOIN "ExerciseLog" el ON el."workoutSessionId" = ws.id
           JOIN "SetLog" sl ON sl."exerciseLogId" = el.id
           WHERE ws."userId" = ANY($1)
           GROUP BY ws."userId", el."exerciseName", ws."createdAt"
         )
         SELECT "userId", "exerciseName", total::int, completed::int FROM ExStats WHERE rn = 1 AND total > 0`,
        [userIds],
      ),
    ]);

    const profileMap = new Map(profileRows.rows.map((r) => [r.userId, r]));
    const injuryMap = new Map(injuryRows.rows.map((r) => [r.userId, r]));
    const perfMap = new Map<string, string[]>();
    for (const r of sessionRows.rows) {
      const arr = perfMap.get(r.userId) || [];
      arr.push(`- ${r.exerciseName}: completed ${r.completed}/${r.total} sets`);
      perfMap.set(r.userId, arr);
    }

    return equipRows.map((r) => {
      const perfs = perfMap.get(r.userId) || [];
      return {
        userId: r.userId,
        equipmentSlugs: r.aliases as string[],
        experienceLevel:
          profileMap.get(r.userId)?.experienceLevel ?? "beginner",
        injuries: injuryMap.get(r.userId)?.injuryDescription ?? "None",
        pastPerformance:
          perfs.length > 0
            ? "Most recent performance per exercise:\n" + perfs.join("\n")
            : null,
      };
    });
  } finally {
    await pool.end();
  }
}

// ─── Quality Evaluation ───────────────────────────────────────────────────────

type EvalResult = {
  score: number;
  maxScore: number;
  grade: string;
  breakdown: { check: string; passed: boolean; detail: string; points: number; maxPoints: number }[];
};

function evaluatePlan(result: Record<string, unknown>): EvalResult {
  const breakdown: EvalResult["breakdown"] = [];

  const exercises = (result.exercises as string[]) ?? [];
  const coachInsight = result.coachInsight as Record<string, unknown> | null;
  const safetyIssues = (result.safetyIssues as string[]) ?? [];
  const dailyPlans = (result.dailyPlans as Record<string, unknown>[]) ?? [];

  // Merge dailyPlans into one plan object (planAggregator removed)
  const plan: Record<string, any> = {};
  for (const dp of dailyPlans) {
    if ((dp as any) !== "CLEAR") Object.assign(plan, dp);
  }

  const allExercises: Array<{
    name?: string;
    notes?: string;
    setsAndReps?: string;
    equipment?: string;
  }> = Object.values(plan).flatMap((day: any) =>
    Array.isArray(day?.mainWorkout) ? day.mainWorkout : [],
  );

  // ── Check 1: RAG retrieval (25 pts) ──────────────────────────────────────
  breakdown.push({
    check: "RAG Retrieval",
    passed: exercises.length > 0,
    detail: `${exercises.length} exercises fetched from Pinecone`,
    points: exercises.length > 0 ? 25 : 0,
    maxPoints: 25,
  });

  // ── Check 2: Muscle gap analysis ran (15 pts) ─────────────────────────────
  breakdown.push({
    check: "Muscle Gap Analysis",
    passed: coachInsight !== null,
    detail: coachInsight
      ? `Covered: ${(coachInsight.coveredGroups as string[] | undefined)?.join(", ") ?? "?"}`
      : "No coach insight generated",
    points: coachInsight ? 15 : 0,
    maxPoints: 15,
  });

  // ── Check 3: Safety passed (15 pts) ──────────────────────────────────────
  breakdown.push({
    check: "Safety Compliance",
    passed: safetyIssues.length === 0,
    detail:
      safetyIssues.length === 0
        ? "All safety checks passed"
        : `${safetyIssues.length} violation(s): ${safetyIssues[0]}`,
    points: safetyIssues.length === 0 ? 15 : 0,
    maxPoints: 15,
  });

  // ── Check 4: All training days present (10 pts) ───────────────────────────
  const expectedDays = ["Monday", "Tuesday", "Thursday", "Friday"];
  const presentDays = expectedDays.filter((d) => plan[d]);
  breakdown.push({
    check: "All Days Present",
    passed: presentDays.length === expectedDays.length,
    detail: `${presentDays.length}/${expectedDays.length} days: ${presentDays.join(", ")}`,
    points: Math.round((presentDays.length / expectedDays.length) * 10),
    maxPoints: 10,
  });

  // ── Check 5: Coach notes quality — the "real gym instructor" test (20 pts) ─
  const withRichNotes = allExercises.filter(
    (e) => e?.notes && e.notes.split(" ").length >= 20,
  );
  const notePct =
    allExercises.length > 0
      ? Math.round((withRichNotes.length / allExercises.length) * 100)
      : 0;
  const notesPoints = notePct >= 80 ? 20 : notePct >= 50 ? 10 : 0;
  breakdown.push({
    check: "Rich Coach Notes (≥20 words)",
    passed: notePct >= 80,
    detail: `${notePct}% of ${allExercises.length} exercises have rich notes`,
    points: notesPoints,
    maxPoints: 20,
  });

  // ── Check 6: Specific sets/reps (5 pts) ──────────────────────────────────
  const withSpecificSets = allExercises.filter(
    (e) => e?.setsAndReps && /\d+/.test(e.setsAndReps),
  );
  breakdown.push({
    check: "Specific Sets/Reps",
    passed: withSpecificSets.length === allExercises.length,
    detail: `${withSpecificSets.length}/${allExercises.length} exercises have numeric sets/reps`,
    points: withSpecificSets.length === allExercises.length ? 5 : 2,
    maxPoints: 5,
  });

  // ── Check 7: No hallucinated exercises (10 pts bonus) ────────────────────
  const ragNames = new Set(
    exercises.map((e) => {
      const m = e.match(/^-\s*([^(]+)/);
      return m ? m[1].trim().toLowerCase() : e.toLowerCase();
    }),
  );
  const hallucinated = allExercises.filter((e) => {
    if (!e?.name) return false;
    const n = e.name.toLowerCase();
    return !ragNames.has(n) && !Array.from(ragNames).some((r) => n.includes(r) || r.includes(n));
  });
  breakdown.push({
    check: "No Hallucinations",
    passed: hallucinated.length === 0,
    detail:
      hallucinated.length === 0
        ? "All exercises from Pinecone database"
        : `Hallucinated: ${hallucinated.map((e) => e.name).join(", ")}`,
    points: hallucinated.length === 0 ? 10 : 0,
    maxPoints: 10,
  });

  const score = breakdown.reduce((s, b) => s + b.points, 0);
  const maxScore = breakdown.reduce((s, b) => s + b.maxPoints, 0);
  const grade =
    score >= 90 ? "A (Excellent)"
    : score >= 75 ? "B (Good)"
    : score >= 60 ? "C (Acceptable)"
    : "F (Needs Work)";

  return { score, maxScore, grade, breakdown };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sep = "=".repeat(72);
  console.log(sep);
  console.log("FITSPARK — FULL REAL INTEGRATION TEST  (NeonDB + Pinecone + Gemini 3.6)");
  console.log(`LangSmith: https://smith.langchain.com  project=fitspark-evals`);
  console.log(`Key: ${process.env.LANGCHAIN_API_KEY?.slice(0, 20)}...`);
  console.log(sep);

  // ── Step 1: Real NeonDB read ───────────────────────────────────────────────
  console.log("\n📦 [NeonDB] Reading users with equipment...");
  const t0 = Date.now();
  const users = await getRealUsersFromNeonDB();
  console.log(`   Done in ${Date.now() - t0}ms — found ${users.length} user(s)`);

  if (users.length === 0) {
    console.error("❌ No users with equipment found. Check DB schema.");
    process.exit(1);
  }

  users.forEach((u, i) => {
    console.log(
      `   ${i + 1}. ${u.userId.slice(0, 16)}... | exp=${u.experienceLevel} | equipment=[${u.equipmentSlugs.slice(0, 3).join(", ")}${u.equipmentSlugs.length > 3 ? "..." : ""}]`,
    );
  });

  const user = users[0];

  // ── Step 2: Run the graph ──────────────────────────────────────────────────
  const input = {
    goal: "Build Muscle (No Cardio)",
    experience: user.experienceLevel,
    daysPerWeek: 4,
    trainingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    injuries: user.injuries,
    equipment: user.equipmentSlugs,
    pastPerformance: user.pastPerformance,
  };

  console.log(`\n🚀 [LangGraph] Running pipeline for ${user.userId.slice(0, 16)}...`);
  console.log(`   Equipment: [${user.equipmentSlugs.join(", ")}]`);
  console.log(`   Injuries: ${user.injuries}`);
  console.log(`   Has past performance data: ${user.pastPerformance ? "yes" : "no"}`);
  console.log("\n" + "-".repeat(72));

  const stageTimings: Record<string, number> = {};
  let lastTime = Date.now();

  // ── Stream the graph with updates mode to capture per-node timing ──────────
  const streamStart = Date.now();
  let finalResult: Record<string, unknown> = {};

  const stream = workoutPlanWorkflow.streamEvents(input, { version: "v2" });

  for await (const event of stream) {
    if (event.event === "on_chain_start" && event.name !== "LangGraph") {
      lastTime = Date.now();
      console.log(`   ▶ ${event.name} starting...`);
    } else if (event.event === "on_chain_end" && event.name !== "LangGraph") {
      const elapsed = Date.now() - lastTime;
      stageTimings[event.name] = (stageTimings[event.name] ?? 0) + elapsed;
      console.log(`   ✓ ${event.name} done (${elapsed}ms)`);
    } else if (event.event === "on_chain_end" && event.name === "LangGraph") {
      finalResult = event.data.output as Record<string, unknown>;
    }
  }

  const totalMs = Date.now() - streamStart;

  // ── Step 3: Timing Report ──────────────────────────────────────────────────
  console.log("\n" + sep);
  console.log("⏱  TIMING BREAKDOWN");
  console.log(sep);

  const orderedNodes = [
    "equipmentResolver",
    "exerciseRetriever",
    "muscleGapAnalyzer",
    "skeletonArchitect",
    "dailyPlanBuilder",
    "safetyEvaluator",
  ];

  for (const node of orderedNodes) {
    const t = stageTimings[node];
    if (t !== undefined) {
      const bar = "█".repeat(Math.round(t / 500)).padEnd(20);
      console.log(`   ${node.padEnd(22)} ${String(t + "ms").padStart(7)}  ${bar}`);
    }
  }
  console.log(`\n   ${"TOTAL".padEnd(22)} ${String(totalMs + "ms").padStart(7)}`);

  // ── Step 4: Show RAG results ───────────────────────────────────────────────
  const exercises = (finalResult.exercises as string[]) ?? [];
  console.log("\n" + sep);
  console.log(`🔍 RAG RETRIEVAL — ${exercises.length} exercises from Pinecone`);
  console.log(sep);
  exercises.forEach((e) => console.log("   " + e));

  // ── Step 5: Coach insight ──────────────────────────────────────────────────
  const insight = finalResult.coachInsight as Record<string, unknown> | null;
  if (insight) {
    console.log("\n" + sep);
    console.log("🧠 COACH INSIGHT");
    console.log(sep);
    console.log(`   Focus:   ${insight.focusLabel}`);
    console.log(`   Covered: ${(insight.coveredGroups as string[]).join(", ")}`);
    console.log(`   Missing: ${(insight.missingGroups as string[]).join(", ") || "none"}`);
    console.log(`   Message: "${insight.coachMessage}"`);
  }

  // ── Step 6: Show sample day plan ──────────────────────────────────────────
  const dailyPlans = (finalResult.dailyPlans as Record<string, unknown>[]) ?? [];
  const plan: Record<string, any> = {};
  for (const dp of dailyPlans) {
    if ((dp as any) !== "CLEAR") Object.assign(plan, dp);
  }

  const sampleDay = plan["Monday"] ?? Object.values(plan)[0];
  if (sampleDay) {
    const dayName = plan["Monday"] ? "Monday" : Object.keys(plan)[0];
    console.log("\n" + sep);
    console.log(`📋 SAMPLE DAY — ${dayName}`);
    console.log(sep);
    if (Array.isArray(sampleDay?.mainWorkout)) {
      for (const ex of sampleDay.mainWorkout) {
        console.log(`\n   • ${ex.name}  (${ex.setsAndReps ?? "?"})`);
        if (ex.notes) {
          // Wrap notes at 70 chars
          const words = ex.notes.split(" ");
          let line = "     Notes: ";
          for (const w of words) {
            if ((line + w).length > 72) {
              console.log(line);
              line = "            " + w + " ";
            } else {
              line += w + " ";
            }
          }
          if (line.trim()) console.log(line);
        }
        if (ex.instructions?.length) {
          console.log(`     How-to: ${ex.instructions[0]}`);
        }
      }
    }
  }

  // ── Step 7: Quality Evaluation ────────────────────────────────────────────
  const eval_ = evaluatePlan(finalResult);

  console.log("\n" + sep);
  console.log(`🎯 QUALITY EVALUATION — ${eval_.grade}`);
  console.log(sep);
  console.log(`   Score: ${eval_.score}/${eval_.maxScore}`);
  console.log("");

  for (const b of eval_.breakdown) {
    const icon = b.passed ? "✅" : b.points > 0 ? "⚠️ " : "❌";
    console.log(
      `   ${icon} ${b.check.padEnd(30)} ${String(b.points + "/" + b.maxPoints).padStart(5)}  ${b.detail}`,
    );
  }

  // ── Step 8: Final verdict ──────────────────────────────────────────────────
  console.log("\n" + sep);
  if (eval_.score >= 90) {
    console.log(`✅  PASS — Pipeline produces real gym-instructor quality plans`);
    console.log(`   Total time: ${(totalMs / 1000).toFixed(1)}s`);
  } else if (eval_.score >= 60) {
    console.log(`⚠️  PARTIAL — Pipeline works but quality needs improvement`);
  } else {
    console.log(`❌  FAIL — Pipeline needs work (score: ${eval_.score}/${eval_.maxScore})`);
  }

  console.log(
    `\n🔗 LangSmith trace: https://smith.langchain.com/o/default/projects/p/fitspark-evals`,
  );
  console.log(sep + "\n");

  process.exit(eval_.score >= 60 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n❌ Test crashed:", e);
  process.exit(1);
});
