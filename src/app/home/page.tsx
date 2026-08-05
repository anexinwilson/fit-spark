import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CalendarDays, Dumbbell } from "lucide-react";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { weeklyWorkoutPlanSchema } from "@/features/workout-plan/schema";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
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
  const plan = savedPlan
    ? weeklyWorkoutPlanSchema.parse(savedPlan.plan)
    : undefined;
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(),
  );
  const todayWorkout = plan?.[today];

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
          Welcome to FitSpark
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Know what to do next at the gym.
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-lg leading-8">
          Your selected equipment, goals, and completed sessions shape the next
          workout in your plan.
        </p>

        {todayWorkout ? (
          <Card className="mt-8 overflow-hidden border-blue-200 shadow-xl shadow-blue-950/5">
            <CardContent className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-8 sm:p-10 dark:from-blue-950/40 dark:via-slate-900 dark:to-cyan-950/30">
              <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
                {today}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Today&apos;s workout
              </h2>
              <div className="text-muted-foreground mt-5 space-y-4 leading-7">
                {todayWorkout.warmup && (
                  <p>
                    <strong>Warm-up:</strong> {todayWorkout.warmup}
                  </p>
                )}
                {todayWorkout.mainWorkout && (
                  <p>
                    <strong>Main workout:</strong> {todayWorkout.mainWorkout}
                  </p>
                )}
                {todayWorkout.cardio && (
                  <p>
                    <strong>Cardio:</strong> {todayWorkout.cardio}
                  </p>
                )}
                {todayWorkout.cooldown && (
                  <p>
                    <strong>Cool-down:</strong> {todayWorkout.cooldown}
                  </p>
                )}
              </div>
              <a
                href="/workoutplan"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "mt-6",
                )}
              >
                View full plan
                <ArrowRight aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        ) : plan ? (
          <Card className="mt-8 border-blue-200 shadow-sm">
            <CardContent className="p-8 sm:p-10">
              <CalendarDays
                className="size-10 text-blue-600"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-2xl font-semibold">Recovery day</h2>
              <p className="text-muted-foreground mt-3 leading-7">
                There is no workout scheduled for today. Check your full plan
                for the next session.
              </p>
              <a
                href="/workoutplan"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-6 bg-blue-600 hover:bg-blue-700",
                )}
              >
                View full plan
                <ArrowRight aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8 border-blue-200 shadow-sm">
            <CardContent className="p-8 sm:p-10">
              <CalendarDays
                className="size-10 text-blue-600"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-2xl font-semibold">
                Build your first plan
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                Choose the equipment you can use, tell us your goal, and get a
                structured sequence for your week.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/workoutplan"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-blue-600 hover:bg-blue-700",
                  )}
                >
                  Build my plan
                  <ArrowRight aria-hidden="true" />
                </a>
                <a
                  href="/explore"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                  )}
                >
                  <Dumbbell aria-hidden="true" />
                  Explore equipment
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
