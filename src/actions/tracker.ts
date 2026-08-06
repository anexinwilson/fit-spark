"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { WeeklyWorkoutPlan, ExerciseDetail } from "@/lib/workout-plan/schema";
import { weeklyWorkoutPlanSchema } from "@/lib/workout-plan/schema";

/**
 * Ensures there's an active workout session for today based on the generated plan.
 */
export async function startTodayWorkout() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const savedPlan = await prisma.workoutPlan.findUnique({
    where: { userId },
  });
  if (!savedPlan) return null;

  const plan = weeklyWorkoutPlanSchema.parse(savedPlan.plan) as WeeklyWorkoutPlan;
  const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const todayWorkout = plan[todayName];
  if (!todayWorkout) return null;

  const sessionName = `${todayName} Workout`;

  // Check if we already have an active session for this today
  let session = await prisma.workoutSession.findFirst({
    where: { userId, name: sessionName, completedAt: null },
    include: { exercises: { include: { sets: true }, orderBy: { order: 'asc' } } },
  });

  // If not, create it
  if (!session) {
    // Collect all exercises in order
    const allExercises: { ex: ExerciseDetail; section: string }[] = [];
    if (todayWorkout.warmup) allExercises.push(...todayWorkout.warmup.map(ex => ({ ex, section: "Warm-up" })));
    if (todayWorkout.mainWorkout) allExercises.push(...todayWorkout.mainWorkout.map(ex => ({ ex, section: "Main Workout" })));
    if (todayWorkout.cardio) allExercises.push(...todayWorkout.cardio.map(ex => ({ ex, section: "Cardio" })));
    if (todayWorkout.cooldown) allExercises.push(...todayWorkout.cooldown.map(ex => ({ ex, section: "Cool-down" })));

    if (allExercises.length === 0) return null;

    session = await prisma.workoutSession.create({
      data: {
        userId,
        name: sessionName,
        exercises: {
          create: allExercises.map((entry, index) => {
            // Parse sets and reps (e.g. "3 sets of 10 reps" or "3 sets x 10 reps")
            const setsMatch = entry.ex.setsAndReps.match(/(\d+)\s*sets?/i);
            const numSets = setsMatch ? parseInt(setsMatch[1], 10) : 1;

            return {
              exerciseName: entry.ex.name,
              pineconeExerciseId: null,
              order: index,
              section: entry.section,
              stickyNote: entry.ex.notes,
              sets: {
                create: Array.from({ length: numSets }).map((_, i) => ({
                  setNumber: i + 1,
                  completed: false,
                })),
              },
            };
          }),
        },
      },
      include: { exercises: { include: { sets: true }, orderBy: { order: 'asc' } } },
    });
  }

  return session;
}

export async function toggleSetCompleted(setId: string, completed: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const setLog = await prisma.setLog.findUnique({
    where: { id: setId },
    include: { exerciseLog: { include: { workoutSession: true } } },
  });

  if (!setLog || setLog.exerciseLog.workoutSession.userId !== userId) {
    throw new Error("Unauthorized or not found");
  }

  await prisma.setLog.update({
    where: { id: setId },
    data: { completed },
  });

  revalidatePath("/today");
}

export async function finishWorkoutSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw new Error("Unauthorized");

  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
  });

  revalidatePath("/today");
  revalidatePath("/history");
}

export async function clearActiveSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw new Error("Unauthorized");

  await prisma.workoutSession.delete({
    where: { id: sessionId },
  });

  revalidatePath("/today");
  revalidatePath("/workoutplan");
}
