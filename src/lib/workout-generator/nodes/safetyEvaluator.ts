import { WorkoutPlanStateType } from "@/lib/workout-generator/state";

export async function safetyEvaluator(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Safety & Compliance Check (programmatic)...");

  if (!state.dailyPlans || state.dailyPlans.length === 0) {
    return {
      safetyIssues: ["No plan generated."],
      retryCount: (state.retryCount || 0) + 1,
    };
  }

  type ExerciseDetail = { name?: string; equipment?: string };

  // Merge daily plans into a single object for checking
  const mergedPlan: Record<string, Record<string, ExerciseDetail[]>> = {};
  for (const dp of state.dailyPlans) {
    if ((dp as any) === "CLEAR") continue;
    Object.assign(mergedPlan, dp);
  }

  const issues: string[] = [];

  const allowedNames = new Set(
    (state.exercises || []).map((e) => {
      const m = e.match(/^-\s*([^(]+)/);
      return m ? m[1].trim().toLowerCase() : e.toLowerCase();
    }),
  );

  // Collect all exercises across all days
  const planExercises: { name: string; section: string }[] = [];
  for (const [, day] of Object.entries(mergedPlan)) {
    if (typeof day !== "object" || !day) continue;
    for (const section of ["mainWorkout", "cardio"]) {
      if (Array.isArray((day as any)[section])) {
        for (const item of (day as any)[section]) {
          if (item?.name) planExercises.push({ name: item.name, section });
        }
      }
    }
  }

  // 1. RAG compliance — exercises must come from Pinecone pool
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

  // 2. Injury safety — flag exercises that stress injured body parts
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

  // 3. Equipment compliance — bodyweight exercises only if Bodyweight was selected
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
    for (const [, day] of Object.entries(mergedPlan)) {
      if (!day || typeof day !== "object") continue;
      if (Array.isArray((day as any).mainWorkout)) {
        for (const item of (day as any).mainWorkout) {
          const name = (item?.name || "").toLowerCase();
          const equip = (item?.equipment || "").toLowerCase();
          if (equip === "bodyweight" || bwKeywords.some((bw) => name.includes(bw))) {
            issues.push(
              `Equipment violation: '${item?.name}' is bodyweight but not selected.`,
            );
          }
        }
      }
    }
  }

  if (issues.length === 0) {
    console.log("   [safetyEvaluator] ✅ All checks passed");
    return { safetyIssues: [] };
  }

  console.log(`   [safetyEvaluator] ⚠️ ${issues.length} issue(s) found`);
  return { safetyIssues: issues, retryCount: (state.retryCount || 0) + 1 };
}
