import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const WorkoutPlanState = Annotation.Root({
  goal: Annotation<string>(),
  experience: Annotation<string>(),
  daysPerWeek: Annotation<number>(),
  trainingDays: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  injuries: Annotation<string>(),
  equipment: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  exercises: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  plan: Annotation<string | null>({
    value: (x, y) => y ?? x,
    default: () => null,
  }),
  safetyIssues: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  retryCount: Annotation<number>({
    value: (x, y) => y ?? x,
    default: () => 0,
  }),
  coachInsight: Annotation<{
    coveredGroups: string[];
    missingGroups: string[];
    focusLabel: string;
    coachMessage: string;
    suggestedEquipment: string[];
  } | null>({
    value: (x, y) => y ?? x,
    default: () => null,
  }),
  instructionsMap: Annotation<Record<string, string[]>>({
    value: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

export type WorkoutPlanStateType = typeof WorkoutPlanState.State;

let config: Record<string, string> = {};
if (process.env.FITSPARK_RUNTIME_CONFIG_JSON) {
  try {
    config = JSON.parse(process.env.FITSPARK_RUNTIME_CONFIG_JSON) as Record<
      string,
      string
    >;
  } catch {}
}

const primaryLlm = new ChatGoogleGenerativeAI({
  model: config.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash",
  temperature: 0.4,
  apiKey: config.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  maxRetries: 0,
});

const fallback1 = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  temperature: 0.4,
  apiKey: config.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  maxRetries: 0,
});

const fallback2 = new ChatGoogleGenerativeAI({
  model: "gemini-3.0-flash",
  temperature: 0.4,
  apiKey: config.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  maxRetries: 0,
});

const llm = primaryLlm.withFallbacks({ fallbacks: [fallback1, fallback2] });

// ---------------------------------------------------------------------------
// Slug → Pinecone display name
// ---------------------------------------------------------------------------
const SLUG_TO_DISPLAY: Record<string, string> = {
  bodyweight: "Bodyweight",
  "body-only": "Bodyweight",
  barbell: "Barbell",
  "cable-machine": "Cable Machine",
  dumbbells: "Dumbbells",
  dumbbell: "Dumbbells",
  "ez-curl-bar": "EZ Curl Bar",
  "exercise-ball": "Exercise Ball",
  "foam-roller": "Foam Roller",
  kettlebell: "Kettlebell",
  "medicine-ball": "Medicine Ball",
  "resistance-bands": "Resistance Bands",
  "ab-crunch-machine": "Ab Crunch Machine",
  "ab-roller": "Ab Roller",
  "assisted-pull-up-machine": "Assisted Pull-Up Machine",
  "atlas-stones": "Atlas Stones",
  "balance-board": "Balance Board",
  "battling-ropes": "Battling Ropes",
  "biceps-curl-machine": "Biceps Curl Machine",
  "butterfly-machine": "Butterfly Machine",
  "calf-press-machine": "Calf Press Machine",
  "calf-raise-machine": "Calf Raise Machine",
  chains: "Chains",
  chair: "Chair",
  "chest-press-machine": "Chest Press Machine",
  "circus-bell": "Circus Bell",
  "climbing-rope": "Climbing Rope",
  "conans-wheel": "Conan's Wheel",
  "dip-machine": "Dip Machine",
  "elliptical-trainer": "Elliptical Trainer",
  "glute-ham-developer": "Glute Ham Developer",
  "gymnastics-rings": "Gymnastics Rings",
  "hack-squat-machine": "Hack Squat Machine",
  "head-harness": "Head Harness",
  "heavy-bag": "Heavy Bag",
  "high-row-machine": "High Row Machine",
  "hyperextension-bench": "Hyperextension Bench",
  "iso-row-machine": "Iso Row Machine",
  "jump-rope": "Jump Rope",
  keg: "Keg",
  "leg-curl-machine": "Leg Curl Machine",
  "leg-extension-machine": "Leg Extension Machine",
  "leg-press-machine": "Leg Press Machine",
  log: "Log",
  "machine-squat": "Machine Squat",
  "parallel-bars": "Parallel Bars",
  "plyometric-box": "Plyometric Box",
  "pull-up-bar": "Pull-Up Bar",
  "reverse-fly-machine": "Reverse Fly Machine",
  "reverse-hyperextension-machine": "Reverse Hyperextension Machine",
  rickshaw: "Rickshaw",
  "rowing-machine": "Rowing Machine",
  sandbag: "Sandbag",
  "shoulder-press-machine": "Shoulder Press Machine",
  "shrug-machine": "Shrug Machine",
  sledgehammer: "Sledgehammer",
  "slide-board": "Slide Board",
  sled: "Sled",
  "smith-machine": "Smith Machine",
  "stair-machine": "Stair Machine",
  "stationary-bike": "Stationary Bike",
  "suspension-trainer": "Suspension Trainer",
  "t-bar-row-machine": "T-Bar Row Machine",
  "thigh-abductor-machine": "Thigh Abductor Machine",
  "thigh-adductor-machine": "Thigh Adductor Machine",
  tire: "Tire",
  "trap-bar": "Trap Bar",
  treadmill: "Treadmill",
  "triceps-extension-machine": "Triceps Extension Machine",
  "weight-plates": "Weight Plates",
  "wrist-roller": "Wrist Roller",
  yoke: "Yoke",
};

function resolveSlug(slug: string): string {
  return SLUG_TO_DISPLAY[slug.toLowerCase()] ?? slug;
}

// ---------------------------------------------------------------------------
// Which muscle groups each equipment covers
// ---------------------------------------------------------------------------
const EQUIPMENT_MUSCLE_MAP: Record<string, string[]> = {
  "Chest Press Machine": ["chest", "shoulders", "triceps"],
  "Butterfly Machine": ["chest"],
  "Ab Crunch Machine": ["core"],
  "Ab Roller": ["core", "shoulders"],
  "Calf Press Machine": ["calves"],
  "Calf Raise Machine": ["calves"],
  "Climbing Rope": ["back", "biceps", "forearms", "shoulders"],
  "Circus Bell": ["shoulders", "traps", "triceps", "core"],
  Barbell: ["chest", "back", "legs", "shoulders", "arms"],
  "Cable Machine": ["chest", "back", "shoulders", "arms", "core"],
  Dumbbells: ["chest", "back", "shoulders", "arms", "legs"],
  Kettlebell: ["legs", "back", "core", "shoulders"],
  "Leg Press Machine": ["legs"],
  "Leg Extension Machine": ["legs"],
  "Leg Curl Machine": ["legs"],
  "Pull-Up Bar": ["back", "biceps"],
  "Assisted Pull-Up Machine": ["back", "biceps"],
  "Shoulder Press Machine": ["shoulders", "triceps"],
  "Biceps Curl Machine": ["biceps"],
  "Triceps Extension Machine": ["triceps"],
  "High Row Machine": ["back"],
  "Iso Row Machine": ["back"],
  "T-Bar Row Machine": ["back"],
  "Hack Squat Machine": ["legs"],
  "Smith Machine": ["legs", "chest", "shoulders"],
  "Rowing Machine": ["back", "legs", "core"],
  Bodyweight: ["chest", "back", "legs", "core", "shoulders", "arms"],
};

const ALL_MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "calves",
];

// Equipment the gym likely has that covers missing groups
const EQUIPMENT_SUGGESTIONS: Record<string, string[]> = {
  back: ["Cable Machine", "Pull-Up Bar", "Barbell", "High Row Machine"],
  legs: [
    "Leg Press Machine",
    "Leg Extension Machine",
    "Leg Curl Machine",
    "Barbell",
  ],
  shoulders: ["Shoulder Press Machine", "Dumbbells", "Cable Machine"],
  arms: [
    "Biceps Curl Machine",
    "Triceps Extension Machine",
    "Cable Machine",
    "Dumbbells",
  ],
  chest: ["Barbell", "Dumbbells", "Cable Machine"],
  core: ["Cable Machine", "Bodyweight"],
};

// ---------------------------------------------------------------------------
// Pinecone helpers
// ---------------------------------------------------------------------------
type PineconeHit = {
  fields?: {
    name?: string;
    equipment_name?: string;
    equipment_slug?: string;
    category?: string;
    level?: string;
    primary_muscles?: string;
    secondary_muscles?: string;
    mechanic?: string;
    force?: string;
    text?: string;
  };
};

function formatExercise(hit: PineconeHit): string | null {
  const f = hit.fields;
  if (!f?.name) return null;
  return [
    `- ${f.name}`,
    `(Equipment: ${f.equipment_name ?? "?"})`,
    `[Category: ${f.category ?? "?"}]`,
    `[Level: ${f.level ?? "?"}]`,
    `[Primary: ${f.primary_muscles ?? "?"}]`,
    f.secondary_muscles ? `[Secondary: ${f.secondary_muscles}]` : "",
    f.mechanic ? `[Mechanic: ${f.mechanic}]` : "",
    f.force ? `[Force: ${f.force}]` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchExercisesForEquipment(
  equipmentDisplayName: string,
  endpoint: string,
  apiKey: string,
  goal: string,
): Promise<PineconeHit[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: {
        inputs: { text: `${equipmentDisplayName} exercises for ${goal}` },
        top_k: 50,
      },
      fields: [
        "name",
        "equipment_name",
        "equipment_slug",
        "category",
        "level",
        "primary_muscles",
        "secondary_muscles",
        "mechanic",
        "force",
        "text",
      ],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result?.hits ?? []) as PineconeHit[];
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

async function equipmentResolver(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Resolving Equipment & Profile...");
  const rawSlugs = state.equipment ?? [];
  const displayNames = rawSlugs.map(resolveSlug);
  console.log(
    `   [equipmentResolver] ${rawSlugs.length} slugs → ${displayNames.join(", ")}`,
  );
  return { equipment: displayNames };
}

async function exerciseRetriever(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Retrieving Exercises from Pinecone (RAG)...");

  const host =
    config.PINECONE_INDEX_HOST || process.env.PINECONE_INDEX_HOST || "";
  const namespace =
    config.PINECONE_NAMESPACE ||
    process.env.PINECONE_NAMESPACE ||
    "exercises-v1";
  const apiKey = config.PINECONE_API_KEY || process.env.PINECONE_API_KEY || "";
  const endpoint = `${host.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(namespace)}/search`;

  const displayNames = state.equipment || [];
  const allowedSet = new Set(displayNames.map((e: string) => e.toLowerCase()));
  if (allowedSet.has("bodyweight")) {
    allowedSet.add("none");
    allowedSet.add("unclassified equipment");
  }

  const allHits: PineconeHit[] = [];
  const seenNames = new Set<string>();
  const instructionsMap: Record<string, string[]> = {};

  await Promise.all(
    displayNames.map(async (equipName: string) => {
      const hits = await fetchExercisesForEquipment(
        equipName,
        endpoint,
        apiKey,
        state.goal,
      );
      const filtered = hits.filter(
        (h) =>
          (h.fields?.equipment_name ?? "").toLowerCase() ===
          equipName.toLowerCase(),
      );
      for (const h of filtered) {
        const name = h.fields?.name ?? "";
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          allHits.push(h);

          // Extract instructions from the text field
          const text = h.fields?.text || "";
          const instructionsRaw =
            text.split("Instructions:\\n")[1] ||
            text.split("Instructions:\n")[1] ||
            "";
          const instructions = instructionsRaw
            .split("\\n")
            .flatMap((s) => s.split("\n"))
            .filter((line: string) => line.trim().length > 0)
            .map((line: string) => line.replace(/^\\d+\\.\\s*/, "").trim());

          if (instructions.length > 0) {
            instructionsMap[name] = instructions;
          }
        }
      }
    }),
  );

  const exercises = allHits.map(formatExercise).filter(Boolean) as string[];
  console.log(
    `   [RAG] ${exercises.length} unique exercises across ${displayNames.length} equipment types`,
  );
  return { exercises, instructionsMap };
}

async function muscleGapAnalyzer(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Analyzing Muscle Group Coverage...");

  const displayNames = state.equipment || [];

  // Find which muscle groups the user's equipment covers
  const coveredSet = new Set<string>();
  for (const eq of displayNames) {
    const muscles = EQUIPMENT_MUSCLE_MAP[eq] ?? [];
    muscles.forEach((m) => coveredSet.add(m));
  }

  const coveredGroups = ALL_MUSCLE_GROUPS.filter((g) => coveredSet.has(g));
  const missingGroups = ALL_MUSCLE_GROUPS.filter((g) => !coveredSet.has(g));

  // Build a label for the plan focus
  const focusLabel =
    coveredGroups.length <= 3
      ? coveredGroups
          .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
          .join(", ") + " Specialist"
      : "Upper Body & Conditioning";

  // Build equipment suggestions for missing groups
  const suggestedEquipment = Array.from(
    new Set(missingGroups.flatMap((g) => EQUIPMENT_SUGGESTIONS[g] ?? [])),
  ).slice(0, 5);

  // Build the coach message
  let coachMessage = "";
  if (missingGroups.length === 0) {
    coachMessage = `Great equipment selection! Your setup covers all major muscle groups. I'll build you a balanced full-body program.`;
  } else {
    const missing = missingGroups
      .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
      .join(", ");
    const suggestions = suggestedEquipment.join(", ");
    coachMessage =
      `Your current equipment focuses on: **${coveredGroups.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}**. ` +
      `You don't have exercises for: **${missing}**. ` +
      `I'll build the best plan possible with what you have. ` +
      `To train all muscle groups, consider adding to your profile: **${suggestions}** — or enable Bodyweight exercises which cover everything.`;
  }

  console.log(`   [muscleGapAnalyzer] Covered: ${coveredGroups.join(", ")}`);
  console.log(
    `   [muscleGapAnalyzer] Missing: ${missingGroups.join(", ") || "none"}`,
  );

  return {
    coachInsight: {
      coveredGroups,
      missingGroups,
      focusLabel,
      coachMessage,
      suggestedEquipment,
    },
  };
}

async function planBuilder(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  const currentRetry = state.retryCount || 0;
  console.log(`-> [Node] Building Plan (Attempt ${currentRetry + 1})...`);

  if (!state.exercises || state.exercises.length === 0) {
    return {
      plan: null,
      safetyIssues: [
        `No exercises found for your selected equipment (${(state.equipment ?? []).join(", ")}). Please add more equipment to your profile.`,
      ],
    };
  }

  const issues = state.safetyIssues || [];
  const safetyContext =
    issues.length > 0
      ? `\n\nCRITICAL: Previous plan was rejected:\n${issues.join("\n")}\nFIX THESE ISSUES.`
      : "";

  const insight = state.coachInsight;
  const coverageNote = insight?.missingGroups.length
    ? `\nNOTE: The user's equipment only covers ${insight.coveredGroups.join(", ")}. Missing: ${insight.missingGroups.join(", ")}. Build the best plan possible with available exercises — DO NOT invent exercises for missing groups.`
    : "";

  const prompt = `You are an expert personal trainer. Build a structured weekly workout plan using ONLY the exercises provided.

USER PROFILE:
- Goal: ${state.goal}
- Experience: ${state.experience}
- Training Days: ${(state.trainingDays || []).join(", ")} (${state.daysPerWeek} days/week)
- Injuries: ${state.injuries || "None"}
- Equipment: ${(state.equipment || []).join(", ")}
${coverageNote}

AVAILABLE EXERCISES (ONLY use these — full metadata included):
${(state.exercises || []).join("\n")}

Use the metadata (primary muscles, secondary muscles, mechanic, force, level) to:
- Spread exercises intelligently across training days
- Avoid hitting the same muscles on consecutive days
- Mix compound and isolation moves purposefully
- Scale sets/reps to the user's experience level
- Write programming notes that explain muscle targeting and pairing rationale ONLY. (DO NOT write form tips or instructions).

${safetyContext}

RULES:
1. MENU ONLY: Use ONLY exercises from the list above. Zero exceptions.
2. EQUIPMENT STRICT: mainWorkout uses ONLY the user's equipment. No bodyweight exercises (push-ups, pull-ups, dips, air squats) unless "Bodyweight" is in equipment list.
3. NO REST DAYS: Non-training days = "Active Recovery" or "Mobility" using exercises from the list (light sets, light weight). If no suitable exercises, omit that day entirely.
4. USE ALL EXERCISES: Distribute ALL available exercises across the week — don't repeat the same 3 every day.
5. RICH NOTES: Every exercise must have a 'notes' field explaining: target muscle, why it's placed here, pairing logic. (Do NOT include step-by-step instructions or form tips. Do NOT prefix the note with "Coach: " or "Note: ").
6. SCHEMA:
   type ExerciseDetail = { name: string; equipment: string; setsAndReps: string; notes: string };
   type DailyWorkoutPlan = { mainWorkout?: ExerciseDetail[]; cardio?: ExerciseDetail[] };
   type WeeklyWorkoutPlan = Record<string, DailyWorkoutPlan>;
   Keys = training days only (e.g. "Monday", "Thursday").

Return ONLY valid JSON starting with '{'. No markdown, no preamble.`;

  const response = await llm.invoke(prompt);
  let planStr = response.content.toString();

  // Merge instructions from instructionsMap
  try {
    const cleanedStr = planStr
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsedPlan = JSON.parse(cleanedStr) as Record<
      string,
      Record<string, Record<string, unknown>[]>
    >;
    const map = state.instructionsMap || {};

    for (const sections of Object.values(parsedPlan)) {
      if (typeof sections !== "object" || !sections) continue;
      for (const exercises of Object.values(sections)) {
        if (Array.isArray(exercises)) {
          for (const ex of exercises) {
            const exName = typeof ex.name === "string" ? ex.name : null;
            if (exName && map[exName]) {
              ex.instructions = map[exName];
            }
          }
        }
      }
    }
    planStr = JSON.stringify(parsedPlan, null, 2);
  } catch (e) {
    console.error("Failed to merge instructions:", e);
  }

  return { plan: planStr };
}

async function safetyEvaluator(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Safety & Compliance Check (programmatic)...");

  if (!state.plan) {
    return {
      safetyIssues: ["No plan generated."],
      retryCount: (state.retryCount || 0) + 1,
    };
  }

  type ExerciseDetail = { name?: string; equipment?: string };
  type DailyWorkoutPlan = Record<string, ExerciseDetail[] | undefined>;

  let parsedPlan: Record<string, DailyWorkoutPlan> = {};
  try {
    const cleaned = state.plan
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    parsedPlan = JSON.parse(cleaned);
  } catch {
    return {
      safetyIssues: ["Invalid JSON format."],
      retryCount: (state.retryCount || 0) + 1,
    };
  }

  const issues: string[] = [];

  const allowedNames = new Set(
    (state.exercises || []).map((e) => {
      const m = e.match(/^-\s*([^(]+)/);
      return m ? m[1].trim().toLowerCase() : e.toLowerCase();
    }),
  );

  const planExercises: { name: string; section: string }[] = [];
  for (const [, day] of Object.entries(parsedPlan)) {
    if (typeof day !== "object" || !day) continue;
    for (const section of ["mainWorkout", "cardio"]) {
      if (Array.isArray(day[section])) {
        for (const item of day[section]) {
          if (item?.name) planExercises.push({ name: item.name, section });
        }
      }
    }
  }

  // 1. RAG compliance
  if (allowedNames.size > 0) {
    for (const { name: ex } of planExercises) {
      const exL = ex.toLowerCase();
      if (!allowedNames.has(exL)) {
        const partial = Array.from(allowedNames).some(
          (a) => exL.includes(a) || a.includes(exL),
        );
        if (!partial) {
          issues.push(`RAG violation: '${ex}' not in exercise database.`);
        }
      }
    }
  }

  // 2. Injury safety
  const injuries = (state.injuries || "").toLowerCase();
  if (injuries && injuries !== "none") {
    const riskMap: Record<string, string[]> = {
      knee: ["squat", "lunge", "leg extension", "jump"],
      shoulder: ["overhead press", "military press", "behind the neck"],
      back: ["deadlift", "good morning", "heavy row"],
    };
    for (const [part, risky] of Object.entries(riskMap)) {
      if (injuries.includes(part)) {
        for (const { name: ex } of planExercises) {
          if (risky.some((r) => ex.toLowerCase().includes(r))) {
            issues.push(`Safety: '${ex}' may aggravate ${part} injury.`);
          }
        }
      }
    }
  }

  // 3. Equipment compliance for mainWorkout
  const hasBodyweight = (state.equipment || []).some(
    (e) => e.toLowerCase() === "bodyweight",
  );
  if (!hasBodyweight) {
    const bwKeywords = [
      "push-up",
      "pushup",
      "bodyweight",
      "pull-up",
      "pullup",
      "dip",
      "air squat",
      "burpee",
    ];
    for (const [, day] of Object.entries(parsedPlan)) {
      if (!day || typeof day !== "object") continue;
      if (Array.isArray(day.mainWorkout)) {
        for (const item of day.mainWorkout) {
          const name = (item?.name || "").toLowerCase();
          const equip = (item?.equipment || "").toLowerCase();
          if (
            equip === "bodyweight" ||
            bwKeywords.some((bw) => name.includes(bw))
          ) {
            issues.push(
              `Equipment violation: '${item?.name}' is bodyweight but not selected.`,
            );
          }
        }
      }
    }
  }

  if (issues.length === 0) return { safetyIssues: [] };
  return { safetyIssues: issues, retryCount: (state.retryCount || 0) + 1 };
}

function shouldRetry(state: WorkoutPlanStateType): "planBuilder" | typeof END {
  const hasIssues =
    Array.isArray(state.safetyIssues) && state.safetyIssues.length > 0;
  if (hasIssues && (state.retryCount || 0) < 2) {
    console.log(`   [Retry] Retrying plan (attempt ${state.retryCount}/2)...`);
    return "planBuilder";
  }
  return END;
}

const workflow = new StateGraph(WorkoutPlanState)
  .addNode("equipmentResolver", equipmentResolver)
  .addNode("exerciseRetriever", exerciseRetriever)
  .addNode("muscleGapAnalyzer", muscleGapAnalyzer)
  .addNode("planBuilder", planBuilder)
  .addNode("safetyEvaluator", safetyEvaluator)
  .addEdge("__start__", "equipmentResolver")
  .addEdge("equipmentResolver", "exerciseRetriever")
  .addEdge("exerciseRetriever", "muscleGapAnalyzer")
  .addEdge("muscleGapAnalyzer", "planBuilder")
  .addEdge("planBuilder", "safetyEvaluator")
  .addConditionalEdges("safetyEvaluator", shouldRetry);

export const workoutPlanWorkflow = workflow.compile();
