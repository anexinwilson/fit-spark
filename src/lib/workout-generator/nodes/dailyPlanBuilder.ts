import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { llm } from "@/lib/workout-generator/config";
import { WorkoutPlanStateType } from "@/lib/workout-generator/state";

/**
 * The Send API injects a per-day context object into each parallel invocation.
 * This interface makes that contract explicit and eliminates all `as any` casts.
 */
interface DailyPlanContext extends Partial<WorkoutPlanStateType> {
  day: string;
  exercises: string[];
  instructionsMap: Record<string, string[]>;
}

export async function dailyPlanBuilder(
  state: DailyPlanContext,
  config: LangGraphRunnableConfig,
) {
  const { day, exercises, instructionsMap, goal, experience, injuries, pastPerformance } = state;

  console.log(`   [dailyPlanBuilder] Generating ${day}...`);
  config.writer?.({ step: `Building ${day}'s workout`, day, progress: 0.1 });

  const prompt = `You are FitSpark's Head Coach building ONE training day: ${day}.

USER CONTEXT:
- Goal: ${goal}
- Experience: ${experience}
- Injuries: ${injuries || "None"}
${pastPerformance ? `- Past Performance:\n${pastPerformance}\n  (Adapt sets/reps based on this. If 0/3 sets completed, reduce volume or intensity.)` : ""}

ASSIGNED EXERCISES FOR ${day.toUpperCase()}:
${exercises.join("\n")}

COACHING RULES:
1. Plan ONLY for ${day} — do not reference other days.
2. Use ONLY the exercises listed above — never invent new ones.
3. For each exercise, write a clean, human-sounding "notes" field (1-2 sentences max) that:
   - NEVER explains how to perform the exercise physically (the UI handles this).
   - Explains exactly WHICH muscles it targets and WHY it was chosen for today's specific routine.
4. setsAndReps must be specific (e.g. "3 sets × 10–12 reps", not "3x10").
5. Be a real, punchy gym instructor. No robotic therapy speak, no robotic AI tone, and no bloated anatomy lessons. Keep it strictly focused on strategy and progression.

OUTPUT — valid JSON only, no markdown:
{
  "mainWorkout": [
    { "name": string, "equipment": string, "setsAndReps": string, "notes": string }
  ]
}`;

  const response = await llm.invoke(prompt);
  config.writer?.({ step: `${day} plan drafted`, day, progress: 0.9 });

  let dayPlan: Record<string, unknown> = {};
  try {
    const raw = response.content.toString().replace(/```json|```/g, "").trim();
    dayPlan = JSON.parse(raw);

    // Inject step-by-step instructions from Pinecone directly into each exercise
    if (Array.isArray(dayPlan.mainWorkout)) {
      for (const ex of dayPlan.mainWorkout as Array<{ name?: string; instructions?: string[] }>) {
        if (ex.name && instructionsMap[ex.name]) {
          ex.instructions = instructionsMap[ex.name];
        }
      }
    }
  } catch (e) {
    console.error(`[dailyPlanBuilder] Failed to parse JSON for ${day}:`, e);
  }

  config.writer?.({ step: `${day} complete`, day, progress: 1.0 });
  return { dailyPlans: [{ [day]: dayPlan }] };
}
