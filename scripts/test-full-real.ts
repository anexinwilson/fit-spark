/**
 * Full real-world integration test.
 * - Reads user equipment FROM Postgres (real DB)
 * - Fetches exercises FROM Pinecone (real vector DB)
 * - Runs LangGraph with real Gemini API
 * - Traces everything to real LangSmith
 *
 * Run: npx tsx scripts/test-full-real.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Set LangSmith env before importing LangGraph
const runtimeConfig = JSON.parse(
  process.env.FITSPARK_RUNTIME_CONFIG_JSON ?? "{}",
);
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_API_KEY =
  process.env.LANGSMITH_API_KEY ??
  process.env.LANGCHAIN_API_KEY ??
  "";
process.env.LANGCHAIN_PROJECT = "fitspark-evals";

import pg from "pg";
import { workoutPlanWorkflow } from "../src/features/workout-generator/graph";

const { Pool } = pg;

async function getUsersFromPostgres() {
  const pool = new Pool({
    connectionString: runtimeConfig.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Get all users who have equipment selected
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

    // Get profile info
    const { rows: profileRows } = await pool.query<{
      userId: string;
      experienceLevel: string;
    }>(
      `SELECT "userId", "experienceLevel"
       FROM "Profile"
       WHERE "userId" = ANY($1)`,
      [equipRows.map((r) => r.userId)],
    );

    // Get injury info
    const { rows: injuryRows } = await pool.query<{
      userId: string;
      injuryDescription: string;
    }>(
      `SELECT "userId", "injuryDescription"
       FROM "HealthProfile"
       WHERE "userId" = ANY($1)`,
      [equipRows.map((r) => r.userId)],
    );

    const profileMap = new Map(profileRows.map((r) => [r.userId, r]));
    const injuryMap = new Map(injuryRows.map((r) => [r.userId, r]));

    return equipRows.map((r) => ({
      userId: r.userId,
      equipmentSlugs: r.aliases as string[],
      experienceLevel: profileMap.get(r.userId)?.experienceLevel ?? "beginner",
      injuries: injuryMap.get(r.userId)?.injuryDescription ?? "None",
    }));
  } finally {
    await pool.end();
  }
}

function evaluateQuality(result: Record<string, unknown>): {
  score: number;
  reasons: string[];
  issues: string[];
} {
  const reasons: string[] = [];
  const issues: string[] = [];
  let score = 0;

  const plan = result.plan as string | null;
  const exercises = (result.exercises as string[]) ?? [];
  const coachInsight = result.coachInsight as Record<string, unknown> | null;
  const safetyIssues = (result.safetyIssues as string[]) ?? [];

  // 1. Did it fetch real exercises from Pinecone?
  if (exercises.length > 0) {
    score += 25;
    reasons.push(`✅ Fetched ${exercises.length} real exercises from Pinecone`);
  } else {
    issues.push(`❌ Zero exercises fetched — RAG broken`);
  }

  // 2. Did the muscle gap analyzer run?
  if (coachInsight) {
    score += 20;
    const insight = coachInsight as {
      coveredGroups?: string[];
      missingGroups?: string[];
      coachMessage?: string;
    };
    reasons.push(
      `✅ Muscle gap analyzed — covers: ${(insight.coveredGroups ?? []).join(", ")}`,
    );
    if ((insight.missingGroups ?? []).length > 0) {
      reasons.push(
        `✅ Gaps detected: ${(insight.missingGroups ?? []).join(", ")}`,
      );
    }
  } else {
    issues.push(`❌ No coach insight generated`);
  }

  // 3. Did it pass safety checks?
  if (safetyIssues.length === 0) {
    score += 20;
    reasons.push(`✅ Passed all safety & compliance checks`);
  } else {
    issues.push(`⚠️ Safety issues: ${safetyIssues.join("; ")}`);
  }

  // 4. Is the plan non-trivial (has coaching notes)?
  if (plan) {
    try {
      const parsed = JSON.parse(
        plan.replace(/```json/g, "").replace(/```/g, "").trim(),
      ) as Record<string, Record<string, { notes?: string }[] | undefined>>;
      const allExercises = Object.values(parsed).flatMap((day) =>
        Object.values(day ?? {}).flat(),
      );
      const withNotes = allExercises.filter(
        (e) => e?.notes && e.notes.length > 50,
      );
      const notePct = Math.round(
        (withNotes.length / Math.max(allExercises.length, 1)) * 100,
      );
      if (notePct >= 80) {
        score += 20;
        reasons.push(
          `✅ ${notePct}% of exercises have rich coach notes (>50 chars)`,
        );
      } else {
        issues.push(
          `⚠️ Only ${notePct}% of exercises have rich notes — too generic`,
        );
        score += 10;
      }

      // 5. Are exercises spread (not all same)?
      const exerciseNames = allExercises
        .map((e) => (e as { name?: string })?.name ?? "")
        .filter(Boolean);
      const unique = new Set(exerciseNames);
      if (unique.size >= Math.min(exercises.length, 5)) {
        score += 15;
        reasons.push(
          `✅ Uses ${unique.size} unique exercises across week (good variety)`,
        );
      } else {
        issues.push(
          `⚠️ Only ${unique.size} unique exercises — plan is repetitive`,
        );
        score += 5;
      }

      // 6. Does it NOT invent exercises outside the RAG list?
      const ragNames = new Set(
        exercises.map((e) => {
          const m = e.match(/^-\s*([^(]+)/);
          return m ? m[1].trim().toLowerCase() : "";
        }),
      );
      const hallucinated = exerciseNames.filter((name) => {
        const nameLower = name.toLowerCase();
        return (
          !ragNames.has(nameLower) &&
          !Array.from(ragNames).some(
            (r) => nameLower.includes(r) || r.includes(nameLower),
          )
        );
      });
      if (hallucinated.length === 0) {
        score += 10; // bonus
        reasons.push(`✅ No hallucinated exercises — all from Pinecone`);
      } else {
        issues.push(
          `❌ Hallucinated exercises: ${hallucinated.slice(0, 3).join(", ")}`,
        );
      }
    } catch {
      issues.push(`❌ Plan JSON is invalid`);
    }
  } else {
    issues.push(`❌ No plan generated`);
  }

  return { score: Math.min(score, 100), reasons, issues };
}

async function main() {
  console.log("=".repeat(70));
  console.log("FITSPARK — FULL REAL INTEGRATION TEST");
  console.log(`LangSmith project: fitspark-evals`);
  console.log(`LangSmith key: ${process.env.LANGCHAIN_API_KEY?.slice(0, 20)}...`);
  console.log("=".repeat(70));

  // Step 1: Read from Postgres
  console.log("\n📦 Reading users from Postgres...");
  const users = await getUsersFromPostgres();

  if (users.length === 0) {
    console.log("❌ No users with equipment found in Postgres");
    return;
  }

  console.log(`Found ${users.length} user(s) with equipment:\n`);
  users.forEach((u, i) => {
    console.log(
      `  ${i + 1}. userId=${u.userId.slice(0, 12)}... | experience=${u.experienceLevel} | equipment=[${u.equipmentSlugs.join(", ")}]`,
    );
  });

  // Test with first user
  const testUser = users[0];
  console.log(
    `\n🧪 Running pipeline for user ${testUser.userId.slice(0, 16)}...\n`,
  );

  const input = {
    goal: "Build Muscle (No Cardio)",
    experience: testUser.experienceLevel,
    daysPerWeek: 4,
    trainingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    injuries: testUser.injuries,
    equipment: testUser.equipmentSlugs, // raw slugs from Postgres
  };

  console.log("Input to LangGraph:");
  console.log(JSON.stringify(input, null, 2));
  console.log("\n" + "-".repeat(70));

  const start = Date.now();
  const result = (await workoutPlanWorkflow.invoke(input)) as Record<
    string,
    unknown
  >;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log(`PIPELINE COMPLETE in ${elapsed}s`);
  console.log("=".repeat(70));

  console.log(`\nEquipment resolved: ${JSON.stringify(result.equipment)}`);
  console.log(`Exercises fetched: ${(result.exercises as string[])?.length ?? 0}`);

  // Show all exercises
  if ((result.exercises as string[])?.length) {
    console.log("\nAll exercises retrieved:");
    (result.exercises as string[]).forEach((e) => console.log(" ", e));
  }

  // Show coach insight
  if (result.coachInsight) {
    const insight = result.coachInsight as {
      coveredGroups: string[];
      missingGroups: string[];
      focusLabel: string;
      coachMessage: string;
      suggestedEquipment: string[];
    };
    console.log("\n" + "=".repeat(70));
    console.log("COACH INSIGHT (what we tell the user)");
    console.log("=".repeat(70));
    console.log(`Focus label: ${insight.focusLabel}`);
    console.log(`Covered: ${insight.coveredGroups.join(", ")}`);
    console.log(`Missing: ${insight.missingGroups.join(", ") || "none"}`);
    console.log(`\nCoach message:\n"${insight.coachMessage}"`);
    if (insight.suggestedEquipment.length) {
      console.log(`\nSuggested to add: ${insight.suggestedEquipment.join(", ")}`);
    }
  }

  // Show safety issues
  if ((result.safetyIssues as string[])?.length) {
    console.log("\n⚠️  Safety issues found:");
    (result.safetyIssues as string[]).forEach((s) => console.log(" ", s));
  }

  // Show generated plan excerpt
  if (result.plan) {
    try {
      const parsed = JSON.parse(
        (result.plan as string).replace(/```json/g, "").replace(/```/g, "").trim(),
      ) as Record<string, Record<string, Array<{ name: string; setsAndReps: string; notes: string }>>>;

      console.log("\n" + "=".repeat(70));
      console.log("GENERATED PLAN — Monday (sample day)");
      console.log("=".repeat(70));
      const monday = parsed["Monday"];
      if (monday) {
        for (const [section, exercises] of Object.entries(monday)) {
          console.log(`\n  ${section.toUpperCase()}:`);
          (exercises ?? []).forEach((ex) => {
            console.log(`    • ${ex.name} — ${ex.setsAndReps}`);
            console.log(`      Coach: ${ex.notes?.slice(0, 120)}...`);
          });
        }
      }
    } catch {
      console.log("(could not parse plan JSON for display)");
    }
  }

  // Quality evaluation
  const { score, reasons, issues } = evaluateQuality(result);
  console.log("\n" + "=".repeat(70));
  console.log(`QUALITY SCORE: ${score}/100`);
  console.log("=".repeat(70));
  reasons.forEach((r) => console.log(r));
  issues.forEach((i) => console.log(i));

  if (score >= 80) {
    console.log("\n✅ PASS — Pipeline is working intelligently like a coach");
  } else if (score >= 50) {
    console.log("\n⚠️  PARTIAL — Pipeline works but quality needs improvement");
  } else {
    console.log("\n❌ FAIL — Pipeline is not producing coach-level plans");
  }

  console.log("\n🔗 View LangSmith traces at: https://smith.langchain.com/");
}

main().catch(console.error);
