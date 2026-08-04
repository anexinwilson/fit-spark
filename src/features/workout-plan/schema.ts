import { z } from "zod";

export const workoutPlanSchema = z.object({
  workoutType: z.string().min(1, "Choose a workout style"),
  fitnessGoal: z.string().min(1, "Choose your main goal"),
  experienceLevel: z.string().min(1, "Choose your experience level"),
  preferredDuration: z.number().int().min(15).max(90),
  includeCardio: z.boolean(),
  ageRange: z.string().min(1, "Choose your age range"),
  equipment: z
    .string()
    .min(2, "Tell us what equipment you can use, or enter bodyweight"),
  limitations: z.string().max(500),
  daysPerWeek: z.number().int().min(2).max(6),
});

export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

export type DailyWorkoutPlan = {
  warmup?: string;
  mainWorkout?: string;
  cooldown?: string;
  cardio?: string;
};

export type WeeklyWorkoutPlan = Record<string, DailyWorkoutPlan>;

export type WorkoutPlanResponse = {
  workoutPlan?: WeeklyWorkoutPlan;
  error?: string;
};
