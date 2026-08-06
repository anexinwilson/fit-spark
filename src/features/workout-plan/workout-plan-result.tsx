import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Info,
  PlayCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  WeeklyWorkoutPlan,
  CoachInsight,
} from "@/features/workout-plan/schema";

const getRotatedDays = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIndex = new Date().getDay();
  return [
    ...days.slice(todayIndex),
    ...days.slice(0, todayIndex)
  ];
};

type WorkoutPlanResultProps = {
  plan: WeeklyWorkoutPlan | string;
  coachInsight?: CoachInsight | null;
};

function WorkoutDetails({ workout }: { workout: WeeklyWorkoutPlan[string] }) {
  const sections = [
    { label: "Warm-up", exercises: workout.warmup },
    { label: "Main workout", exercises: workout.mainWorkout },
    { label: "Cardio", exercises: workout.cardio },
    { label: "Cool-down", exercises: workout.cooldown },
  ];

  return (
    <div className="space-y-6">
      {sections.map(
        ({ label, exercises }) =>
          exercises &&
          exercises.length > 0 && (
            <div key={label}>
              <h4 className="text-foreground mb-3 font-semibold">{label}</h4>
              <ul className="space-y-3">
                {exercises.map((ex, idx) => (
                    <li
                      key={idx}
                      className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 text-sm shadow-xl transition-all hover:bg-white/10"
                    >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {ex.name}
                        </p>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          {ex.setsAndReps}
                        </p>
                        {ex.notes && (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 italic">
                            {ex.notes}
                          </p>
                        )}
                        {ex.instructions && ex.instructions.length > 0 && (
                          <div className="mt-2">
                            <Dialog>
                              <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                <PlayCircle className="size-4" />
                                How to perform
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl bg-white/95 dark:bg-slate-950/95 shadow-2xl border-slate-200/50 dark:border-slate-800/50 sm:rounded-2xl">
                                <DialogHeader className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 pb-4 backdrop-blur-xl -mt-2 pt-2">
                                  <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">{ex.name}</DialogTitle>
                                  <DialogDescription className="text-slate-500 font-medium">
                                    Official execution guide
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 flex-1 overflow-y-auto pr-1 sm:pr-2">
                                  <div>
                                    <Badge variant="secondary" className="shadow-sm py-1.5 px-3 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40">
                                      {ex.equipment}
                                    </Badge>
                                  </div>
                                  <div className="space-y-3 pb-2">
                                    {ex.instructions.map((step, i) => {
                                      const cleanStep = step.replace(/^\d+\.\s*/, '');
                                      return (
                                        <div key={i} className="group flex gap-4 items-start bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 transition-colors hover:border-slate-200 dark:hover:border-slate-700">
                                          <div className="flex shrink-0 items-center justify-center size-7 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 dark:group-hover:ring-blue-800 transition-all">
                                            {i + 1}
                                          </div>
                                          <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 pt-0.5">
                                            {cleanStep}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {ex.equipment}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  );
}

export function WorkoutPlanResult({
  plan,
  coachInsight,
}: WorkoutPlanResultProps) {
  if (typeof plan === "string") {
    return (
      <section aria-live="polite" className="space-y-6">
        <div>
          <Badge className="bg-blue-100 text-blue-800">
            Your plan is ready
          </Badge>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Here is your workout plan
          </h2>
        </div>
        <Card className="border-blue-500 p-6 shadow-md ring-2 ring-blue-500/10">
          <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {plan}
          </div>
        </Card>
      </section>
    );
  }

  const dynamicOrderedDays = getRotatedDays();
  const activeDays = dynamicOrderedDays.filter((day) => plan[day]);
  const [today, next, ...later] = activeDays;

  if (!today) return null;

  return (
    <section aria-live="polite" className="space-y-6">
      <div>
        <Badge className="bg-blue-100 text-blue-800">Your plan is ready</Badge>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Start with this workout
        </h2>
        <p className="text-muted-foreground mt-2">
          Follow the sequence in order. The dates can move when your week does.
        </p>
      </div>

      {coachInsight && (
        <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <CardHeader className="flex flex-row items-start gap-4 pb-3">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
              <Info className="size-5" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-lg text-indigo-900 dark:text-indigo-300">
                Program Analysis: {coachInsight.focusLabel}
              </CardTitle>
              <div className="prose prose-sm prose-indigo text-sm leading-relaxed text-indigo-800/80 dark:text-indigo-300/80">
                <p>
                  <strong>Covered:</strong>{" "}
                  {coachInsight.coveredGroups
                    .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                    .join(", ")}
                  <br />
                  <strong>Missing:</strong>{" "}
                  {coachInsight.missingGroups.length
                    ? coachInsight.missingGroups
                        .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                        .join(", ")
                    : "None"}
                </p>
                <p>{coachInsight.coachMessage}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="overflow-hidden border-white/5 shadow-2xl bg-card/40 backdrop-blur-3xl pt-0">
        <CardHeader className="flex flex-row items-center gap-4 border-b border-white/5 bg-black/20 px-4 py-3 sm:px-5 sm:py-3.5 space-y-0">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <CheckCircle2 className="size-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl font-bold tracking-tight">{today}</CardTitle>
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/10">First workout</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <WorkoutDetails workout={plan[today]} />
        </CardContent>
      </Card>

      {next && (
        <Card className="overflow-hidden border-white/5 shadow-2xl bg-card/40 backdrop-blur-3xl pt-0">
          <CardHeader className="flex flex-row items-center gap-4 border-b border-white/5 bg-black/20 px-4 py-3 sm:px-5 sm:py-3.5 space-y-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50/50 dark:bg-blue-900/10">
              <ChevronRight className="size-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-bold tracking-tight">{next}</CardTitle>
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/10">Next workout</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <WorkoutDetails workout={plan[next]} />
          </CardContent>
        </Card>
      )}

      {later.length > 0 && (
        <details className="bg-card rounded-xl border p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
            <CalendarDays className="size-5 text-blue-600" aria-hidden="true" />
            View the rest of this week
          </summary>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {later.map((day) => (
              <Card key={day} className="shadow-none border-white/5 bg-black/10">
                <CardHeader className="border-b border-white/5 bg-black/20 p-4">
                  <CardTitle className="text-lg">{day}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <WorkoutDetails workout={plan[day]} />
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Stop if you feel sharp, sudden, or worsening pain. Ask qualified gym
        staff or a healthcare professional when you are unsure about safe setup
        or an existing condition.
      </p>
    </section>
  );
}
