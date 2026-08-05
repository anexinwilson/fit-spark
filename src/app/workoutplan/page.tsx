import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { WorkoutPlanForm } from "@/features/workout-plan/workout-plan-form";
import { weeklyWorkoutPlanSchema } from "@/features/workout-plan/schema";
import { prisma } from "@/lib/prisma";

export default async function WorkoutPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { subscriptionActive: true },
  });
  if (!profile) redirect("/create-profile");
  if (!profile.subscriptionActive) redirect("/subscribe");

  const savedPlan = await prisma.workoutPlan.findUnique({
    where: { userId },
    select: { plan: true },
  });
  const initialPlan = savedPlan
    ? weeklyWorkoutPlanSchema.parse(savedPlan.plan)
    : undefined;

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
            My plan
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Let’s make your next gym visit clear.
          </h1>
          <p className="text-muted-foreground mt-3 text-lg leading-8">
            Choose the equipment you can use, share your goal and experience,
            and FitSpark will build a structured sequence for your week.
          </p>
        </div>
        <WorkoutPlanForm initialPlan={initialPlan} />
      </div>
    </section>
  );
}
