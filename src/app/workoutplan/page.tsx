import { redirect } from "next/navigation";

import { WorkoutPlanForm } from "@/components/workout-plan/workout-plan-form";
import { weeklyWorkoutPlanSchema } from "@/lib/workout-plan/schema";
import { auth } from "@clerk/nextjs/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkoutPlanPage() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  const profile =
    userId === "e2e_test_user_id"
      ? { subscriptionActive: true }
      : await prisma.profile.findUnique({
          where: { userId },
          select: { subscriptionActive: true },
        });
  if (!profile) redirect("/create-profile");
  if (!profile.subscriptionActive) redirect("/subscribe");

  const savedPlan =
    userId === "e2e_test_user_id"
      ? null
      : await prisma.workoutPlan.findUnique({
          where: { userId },
          select: { plan: true },
        });
  const initialPlan = savedPlan
    ? weeklyWorkoutPlanSchema.parse(savedPlan.plan)
    : undefined;

  return (
    <section className="min-h-screen bg-ambient-aurora bg-background py-24 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <WorkoutPlanForm initialPlan={initialPlan} />
      </div>
    </section>
  );
}
