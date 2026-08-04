import { z } from "zod";

import {
  type WorkoutPlanInput,
  type WeeklyWorkoutPlan,
} from "@/features/workout-plan/schema";
import { generateGeminiJson } from "@/lib/ai/gemini";

const dailyWorkoutSchema = z.object({
  warmup: z.string().optional(),
  mainWorkout: z.string().optional(),
  cooldown: z.string().optional(),
  cardio: z.string().optional(),
});

const weeklyWorkoutSchema = z.record(z.string(), dailyWorkoutSchema);

function buildWorkoutPrompt(input: WorkoutPlanInput) {
  return `You are a certified fitness trainer creating a safe, beginner-friendly workout sequence.

Generate a personalized ${input.daysPerWeek}-day workout plan with these preferences:
- Workout type: ${input.workoutType}
- Main goal: ${input.fitnessGoal}
- Experience: ${input.experienceLevel}
- Age range: ${input.ageRange}
- Available equipment: ${input.equipment}
- Limitations: ${input.limitations || "None reported"}
- Session length: ${input.preferredDuration} minutes
- Include cardio: ${input.includeCardio ? "Yes" : "No"}

Requirements:
- Use weekday names starting with Monday as object keys.
- Each day may contain warmup, mainWorkout, cardio, and cooldown strings.
- Use plain language and include sets, repetitions or time, and rest guidance.
- Do not train the same muscle group on consecutive days; allow about 48 hours of recovery.
- Keep beginner volume conservative and provide a gentler alternative when appropriate.
- Never advise training through sharp, sudden, or worsening pain.
- Return JSON only, without Markdown or commentary.`;
}

export async function createWorkoutPlan(
  input: WorkoutPlanInput,
): Promise<WeeklyWorkoutPlan> {
  const rawPlan = await generateGeminiJson(buildWorkoutPrompt(input));
  const parsed = JSON.parse(rawPlan) as unknown;
  return weeklyWorkoutSchema.parse(parsed);
}
