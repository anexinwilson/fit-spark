import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklyWorkoutPlan } from "@/features/workout-plan/schema";

const orderedDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type WorkoutPlanResultProps = {
  plan: WeeklyWorkoutPlan | string;
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
                    className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {ex.name}
                        </p>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          {ex.setsAndReps}
                        </p>
                        {ex.notes && (
                          <p className="mt-1 text-xs text-slate-500 italic">
                            {ex.notes}
                          </p>
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

export function WorkoutPlanResult({ plan }: WorkoutPlanResultProps) {
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

  const activeDays = orderedDays.filter((day) => plan[day]);
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

      <Card className="border-blue-500 shadow-md ring-2 ring-blue-500/10">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700 uppercase">
              First workout
            </p>
            <CardTitle className="mt-1 text-2xl">{today}</CardTitle>
          </div>
          <CheckCircle2 className="size-9 text-blue-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <WorkoutDetails workout={plan[today]} />
        </CardContent>
      </Card>

      {next && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <ChevronRight className="text-blue-600" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-sm">Next workout</p>
              <CardTitle>{next}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
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
              <Card key={day} className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">{day}</CardTitle>
                </CardHeader>
                <CardContent>
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
