import { z } from "zod";

export const workoutPlanSchema = z.object({
  workoutType: z.string().min(1, "Choose a workout style"),
  fitnessGoal: z.string().min(1, "Choose your main goal"),
  experienceLevel: z.string().min(1, "Choose your experience level"),
  preferredDuration: z.number().int().min(15).max(240),
  includeCardio: z.boolean(),
  ageRange: z.string().optional(),
  equipment: z
    .string()
    .min(2, "Tell us what equipment you can use, or enter bodyweight"),
  limitations: z.string().max(500),
  trainingDays: z.array(z.string()).min(1, "Select at least one day"),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
});

export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

export const workoutPlanDraftSchema = z.object({
  step: z.number().int().min(0).max(2),
  input: workoutPlanSchema.partial().extend({
    limitations: z.string().max(500),
  }),
});

export type WorkoutPlanDraft = z.infer<typeof workoutPlanDraftSchema>;

export type ExerciseDetail = {
  name: string;
  equipment: string;
  setsAndReps: string;
  notes?: string;
};

export type DailyWorkoutPlan = {
  warmup?: ExerciseDetail[];
  mainWorkout?: ExerciseDetail[];
  cooldown?: ExerciseDetail[];
  cardio?: ExerciseDetail[];
};

export type WeeklyWorkoutPlan = Record<string, DailyWorkoutPlan>;

const exerciseDetailSchema = z.object({
  name: z.string(),
  equipment: z.string(),
  setsAndReps: z.string(),
  notes: z.string().optional(),
});

export const weeklyWorkoutPlanSchema = z.record(
  z.string(),
  z.object({
    warmup: z.array(exerciseDetailSchema).optional(),
    mainWorkout: z.array(exerciseDetailSchema).optional(),
    cooldown: z.array(exerciseDetailSchema).optional(),
    cardio: z.array(exerciseDetailSchema).optional(),
  }),
);

export type CoachInsight = {
  coveredGroups: string[];
  missingGroups: string[];
  focusLabel: string;
  coachMessage: string;
  suggestedEquipment: string[];
};

export type WorkoutPlanResponse = {
  workoutPlan?: WeeklyWorkoutPlan;
  error?: string;
  coachInsight?: CoachInsight | null;
};
