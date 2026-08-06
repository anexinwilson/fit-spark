import { END, Send } from "@langchain/langgraph";
import { WorkoutPlanStateType } from "@/lib/workout-generator/state";

export function shouldSpawnDays(state: WorkoutPlanStateType) {
  // If skeleton failed with no mapping, go directly to safety for error reporting
  if (
    state.safetyIssues?.length > 0 &&
    !Object.keys(state.skeletonMapping || {}).length
  ) {
    return "safetyEvaluator";
  }

  const sends: Send[] = [];
  const mapping = state.skeletonMapping || {};

  for (const day of state.trainingDays || []) {
    if (mapping[day] && mapping[day].length > 0) {
      sends.push(
        new Send("dailyPlanBuilder", {
          // Pass full context each day needs — no shared mutable state
          day,
          exercises: mapping[day],
          goal: state.goal,
          experience: state.experience,
          equipment: state.equipment,
          injuries: state.injuries,
          pastPerformance: state.pastPerformance,
          // Pass instructionsMap so each day can self-inject RAG instructions
          instructionsMap: state.instructionsMap,
        }),
      );
    }
  }

  if (sends.length === 0) return "safetyEvaluator";
  return sends;
}

export function shouldRetry(
  state: WorkoutPlanStateType,
): "skeletonArchitect" | typeof END {
  const hasIssues =
    Array.isArray(state.safetyIssues) && state.safetyIssues.length > 0;
  if (hasIssues && (state.retryCount || 0) < 2) {
    console.log(`   [Retry] Retrying plan (attempt ${state.retryCount}/2)...`);
    return "skeletonArchitect";
  }
  return END;
}
