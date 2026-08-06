import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { weeklyWorkoutPlanSchema } from "@/lib/workout-plan/schema";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { startTodayWorkout } from "@/actions/tracker";
import { ExerciseTracker } from "@/components/workout-plan/exercise-tracker";
import { RestDayDashboard } from "@/components/workout-plan/rest-day-dashboard";

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

  let session = null;
  let originalPlan = null;

  if (plan) {
    const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
      new Date(),
    );
    // Find a matching day in the plan (case-insensitive)
    const matchedKey = Object.keys(plan).find(
      (key) => key.toLowerCase() === todayName.toLowerCase()
    );
    originalPlan = matchedKey ? plan[matchedKey] : null;
    session = await startTodayWorkout();
  }

  return (
    <main className="min-h-screen bg-ambient-aurora bg-background py-24 relative overflow-hidden">
      {/* Subtle glowing orb in background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <div className="mt-4 mb-8">
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl italic text-foreground animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Know what to do next.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            Your selected equipment, goals, and completed sessions shape the exact sequence you need to follow.
          </p>
        </div>

        {session && originalPlan ? (
          <div className="mt-0">
            <ExerciseTracker session={session} originalPlan={originalPlan} />
          </div>
        ) : plan ? (
          <RestDayDashboard plan={plan} todayName={new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())} />
        ) : (
          <Card className="mt-0 overflow-hidden border-primary/20 shadow-[0_0_50px_rgba(139,92,246,0.1)] bg-card/60 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <CardContent className="p-12 text-center">
              <div className="mx-auto size-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                <CalendarDays className="size-8 text-primary" />
              </div>
              <h2 className="text-3xl font-black italic tracking-tight">Build your first program</h2>
              <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-lg leading-relaxed">
                Choose the equipment you can use, tell us your goal, and we&apos;ll generate a structured sequence for your week.
              </p>
              <a
                href="/workoutplan"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all px-8 h-14 text-lg font-semibold",
                )}
              >
                Generate my program
                <ArrowRight aria-hidden="true" className="ml-2 size-5" />
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
