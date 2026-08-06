"use client";

import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { type WeeklyWorkoutPlan } from "@/features/workout-plan/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const orderedDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RestDayDashboard({
  plan,
  todayName,
}: {
  plan: WeeklyWorkoutPlan;
  todayName: string;
}) {
  const planDays = Object.keys(plan).map((k) => k.toLowerCase());
  const todayIdx = orderedDays.findIndex((d) => d.toLowerCase() === todayName.toLowerCase());

  // Find the next scheduled day
  let nextDayIdx = -1;
  for (let i = 1; i <= 7; i++) {
    const checkIdx = (todayIdx + i) % 7;
    const checkDay = orderedDays[checkIdx];
    if (planDays.includes(checkDay.toLowerCase())) {
      nextDayIdx = checkIdx;
      break;
    }
  }

  const nextDayName = nextDayIdx !== -1 ? orderedDays[nextDayIdx] : null;
  // Match original key casing from the plan
  const matchedKey = nextDayName
    ? Object.keys(plan).find((k) => k.toLowerCase() === nextDayName.toLowerCase())
    : null;
  const nextWorkout = matchedKey ? plan[matchedKey] : null;

  // Calculate exercises count in next workout
  let nextExerciseCount = 0;
  if (nextWorkout) {
    if (nextWorkout.warmup) nextExerciseCount += nextWorkout.warmup.length;
    if (nextWorkout.mainWorkout) nextExerciseCount += nextWorkout.mainWorkout.length;
    if (nextWorkout.cardio) nextExerciseCount += nextWorkout.cardio.length;
    if (nextWorkout.cooldown) nextExerciseCount += nextWorkout.cooldown.length;
  }

  return (
    <div className="space-y-6 mt-0">
      <Card className="overflow-hidden border-white/5 shadow-2xl bg-card/40 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
        <CardHeader className="border-b border-white/5 bg-black/20 p-6">
          <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            <Calendar className="size-5 text-primary" />
            Your Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {orderedDays.map((day, idx) => {
              const isToday = idx === todayIdx;
              const hasWorkout = planDays.includes(day.toLowerCase());
              
              return (
                <div key={day} className="flex flex-col items-center gap-2 min-w-[3rem]">
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {day.slice(0, 3)}
                  </span>
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2",
                    isToday ? "border-primary bg-primary/10" : "border-white/10 bg-black/20",
                    hasWorkout && !isToday && "border-white/20 bg-white/5"
                  )}>
                    {hasWorkout ? (
                      <div className="size-2 rounded-full bg-primary" />
                    ) : (
                      <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {nextWorkout && nextDayName && (
        <Card className="overflow-hidden border-primary/20 shadow-[0_0_50px_rgba(139,92,246,0.1)] bg-card/60 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <CardHeader className="border-b border-white/5 bg-black/20 p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Up Next
            </p>
            <CardTitle className="mt-2 text-3xl font-black italic tracking-tighter sm:text-5xl">
              {nextDayName}&apos;s Workout
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-6">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/20">
                <span className="text-2xl font-bold text-primary">{nextExerciseCount}</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Exercises Scheduled</p>
                <p className="text-sm text-muted-foreground">Get some rest today, your next session is ready.</p>
              </div>
            </div>

            <Link
              href="/workoutplan"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 w-full rounded-full bg-white text-black hover:bg-white/90 font-semibold",
              )}
            >
              Preview Full Schedule
              <ArrowRight aria-hidden="true" className="ml-2 size-5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
