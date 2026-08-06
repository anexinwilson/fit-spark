import { WorkoutPlanStateType } from "@/lib/workout-generator/state";
import { llm } from "@/lib/workout-generator/config";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export async function skeletonArchitect(
  state: WorkoutPlanStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<WorkoutPlanStateType>> {
  const currentRetry = state.retryCount || 0;
  console.log(`-> [Node] Building Skeleton (Attempt ${currentRetry + 1})...`);

  config.writer?.({
    step: "Building weekly workout structure",
    progress: 0.3,
  });

  if (!state.exercises || state.exercises.length === 0) {
    return {
      skeletonMapping: {},
      safetyIssues: [
        `No exercises found for your selected equipment (${(state.equipment ?? []).join(", ")}). Please add more equipment to your profile.`,
      ],
    };
  }

  const issues = state.safetyIssues || [];
  const safetyContext =
    issues.length > 0
      ? `\n\nCRITICAL: Previous plan was rejected for these violations:\n${issues.join("\n")}\nYou MUST fix ALL of these in this attempt.`
      : "";

  let focusInstruction = "General fitness and hypertrophy based on goals.";
  if (state.coachInsight) {
    const { missingGroups, coachMessage } = state.coachInsight;
    focusInstruction = `PRIORITY FOCUS: ${coachMessage}\nMust include muscle groups: ${missingGroups.join(", ")}\n`;
  }

  const prompt = `You are FitSpark's Head Coach designing a weekly training split.

USER PROFILE:
- Goal: ${state.goal}
- Experience: ${state.experience} level
- Training Days: ${(state.trainingDays || []).join(", ")}
- Injuries: ${state.injuries || "None"}

AVAILABLE EXERCISES (use ONLY these):
${(state.exercises || []).join("\n")}

${focusInstruction}

ASSIGNMENT RULES:
1. Distribute exercises using a logical split (Upper/Lower or Push/Pull/Legs).
2. Each exercise must be assigned to at least 1 day. Do not leave exercises unused.
3. Balance volume — avoid overloading any single day.
4. Use ONLY exercise names exactly as listed above.
${safetyContext}

Return ONLY valid JSON: Record<string, string[]>
Keys = training day names. Values = array of exact exercise names for that day.
No markdown, no explanation, no preamble.`;

  const response = await llm.invoke(prompt);
  config.writer?.({ step: "Weekly structure ready", progress: 0.5 });

  let mapping: Record<string, string[]> = {};
  try {
    const cleanedStr = response.content
      .toString()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    mapping = JSON.parse(cleanedStr);
  } catch (e) {
    console.error("Failed to parse skeleton", e);
    return { safetyIssues: ["Failed to parse skeleton JSON."] };
  }

  return { skeletonMapping: mapping, dailyPlans: ["CLEAR"] as any };
}
