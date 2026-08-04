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
  plan: WeeklyWorkoutPlan;
};

function WorkoutDetails({ workout }: { workout: WeeklyWorkoutPlan[string] }) {
  return (
    <dl className="space-y-4 text-sm leading-6">
      {[
        ["Warm-up", workout.warmup],
        ["Main workout", workout.mainWorkout],
        ["Cardio", workout.cardio],
        ["Cool-down", workout.cooldown],
      ].map(
        ([label, value]) =>
          value && (
            <div key={label}>
              <dt className="text-foreground font-semibold">{label}</dt>
              <dd className="text-muted-foreground mt-1 whitespace-pre-line">
                {value}
              </dd>
            </div>
          ),
      )}
    </dl>
  );
}

export function WorkoutPlanResult({ plan }: WorkoutPlanResultProps) {
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
