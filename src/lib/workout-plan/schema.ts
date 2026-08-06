import { z } from "zod";

// ─── Form Input ───────────────────────────────────────────────────────────────

export const workoutPlanSchema = z.object({
  fitnessGoal: z.string().min(1, "Please select a fitness goal"),
  experienceLevel: z.string().min(1, "Please select your experience level"),
  preferredDuration: z.number(),
  includeCardio: z.boolean(),
  /** Comma-separated equipment aliases — split before sending to the graph */
  equipment: z.string().min(1, "Please select at least one piece of equipment"),
  limitations: z.string().optional(),
  trainingDays: z.array(z.string()).min(1, "Please select at least one training day"),
  daysPerWeek: z.number().optional(),
});

export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

// ─── Draft (persisted wizard progress) ───────────────────────────────────────

export const workoutPlanDraftSchema = z.object({
  step: z.number(),
  input: workoutPlanSchema.partial(),
});

export type WorkoutPlanDraft = z.infer<typeof workoutPlanDraftSchema>;

// ─── Generated Plan Output ────────────────────────────────────────────────────

/** A single exercise within a day's workout */
export interface Exercise {
  name: string;
  equipment?: string;
  setsAndReps: string;
  notes?: string;
  instructions?: string[];
}

/** Alias used by tracker.ts when building exercise log records */
export type ExerciseDetail = Exercise;

/** One training day — mainWorkout is required; others are optional */
export interface DayPlan {
  mainWorkout: Exercise[];
  cardio?: Exercise[];
  warmup?: Exercise[];
  cooldown?: Exercise[];
}

/**
 * The full weekly plan stored in the DB and returned by /api/generate-plan.
 * Keys are day names e.g. "Monday", "Tuesday".
 */
export type WeeklyWorkoutPlan = Record<string, DayPlan>;

/** Zod schema for parsing/validating the plan JSON read from the database */
const exerciseSchema: z.ZodType<Exercise> = z.object({
  name: z.string(),
  equipment: z.string().optional(),
  setsAndReps: z.string(),
  notes: z.string().optional(),
  instructions: z.array(z.string()).optional(),
});

const dayPlanSchema: z.ZodType<DayPlan> = z.object({
  mainWorkout: z.array(exerciseSchema),
  cardio: z.array(exerciseSchema).optional(),
  warmup: z.array(exerciseSchema).optional(),
  cooldown: z.array(exerciseSchema).optional(),
});

export const weeklyWorkoutPlanSchema = z.record(z.string(), dayPlanSchema);

// ─── Coach Insight ────────────────────────────────────────────────────────────

export interface CoachInsight {
  coveredGroups: string[];
  missingGroups: string[];
  focusLabel: string;
  coachMessage: string;
  suggestedEquipment: string[];
}

// ─── SSE Response (streamed from /api/generate-plan) ─────────────────────────

export interface WorkoutPlanResponse {
  complete?: boolean;
  workoutPlan?: WeeklyWorkoutPlan;
  exercisesUsed?: string[];
  coachInsight?: CoachInsight | null;
  status?: string;
  node?: string;
  log?: string;
  error?: string;
}
