import { Annotation } from "@langchain/langgraph";

/**
 * Shared state passed between all nodes in the workout generation graph.
 * Each field has an explicit reducer — no field ever silently overwrites another.
 */
export const WorkoutPlanState = Annotation.Root({
  // ── User inputs ──────────────────────────────────────────────────────────
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
  pastPerformance: Annotation<string | null>({
    value: (x, y) => y ?? x,
    default: () => null,
  }),

  // ── Pipeline intermediates ───────────────────────────────────────────────
  /** Raw exercise strings from Pinecone RAG, formatted for LLM context */
  exercises: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  /** name → step-by-step instructions extracted from Pinecone text field */
  instructionsMap: Annotation<Record<string, string[]>>({
    value: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  /** day → exercise names assigned by skeletonArchitect */
  skeletonMapping: Annotation<Record<string, string[]>>({
    value: (x, y) => y ?? x,
    default: () => ({}),
  }),
  /** Muscle group coverage analysis from muscleGapAnalyzer */
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

  // ── Outputs ──────────────────────────────────────────────────────────────
  /**
   * Each dailyPlanBuilder appends { [day]: { mainWorkout: [...] } } here.
   * The reducer auto-merges parallel outputs — no aggregator node needed.
   * Send ["CLEAR"] to reset before a retry.
   */
  dailyPlans: Annotation<Record<string, unknown>[]>({
    value: (x, y) => {
      if (y.length > 0 && (y[0] as any) === "CLEAR") return [];
      return x.concat(y);
    },
    default: () => [],
  }),

  // ── Control flow ─────────────────────────────────────────────────────────
  safetyIssues: Annotation<string[]>({
    value: (x, y) => y ?? x,
    default: () => [],
  }),
  retryCount: Annotation<number>({
    value: (x, y) => y ?? x,
    default: () => 0,
  }),
});

export type WorkoutPlanStateType = typeof WorkoutPlanState.State;
