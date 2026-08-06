import { Controller, type UseFormReturn } from "react-hook-form";
import { type WorkoutPlanInput } from "@/lib/workout-plan/schema";
import { cn } from "@/lib/utils";
import { ChoiceCard } from "@/components/workout-plan/step-goal";
import { Checkbox } from "@/components/ui/checkbox";

export function SmallChoice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        selected
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      )}
    >
      {label}
    </button>
  );
}

export function StepExperience({
  form,
}: {
  form: UseFormReturn<WorkoutPlanInput>;
}) {
  const preferredDuration = form.watch("preferredDuration") ?? 45;

  return (
    <div className="space-y-8">
      <Controller
        control={form.control}
        name="experienceLevel"
        render={({ field }) => (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                How familiar are you with workouts?
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                This changes the starting pace and explanations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["beginner", "I am new", "Show me the basics"],
                ["intermediate", "Some experience", "I know the basics"],
                ["advanced", "I train regularly", "Keep it efficient"],
              ].map(([value, label, description]) => (
                <ChoiceCard
                  key={value}
                  label={label}
                  description={description}
                  selected={field.value === value}
                  onClick={() => field.onChange(value)}
                />
              ))}
            </div>
          </div>
        )}
      />

      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Start with a simple schedule
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          You can change this when your week changes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Controller
            control={form.control}
            name="trainingDays"
            render={({ field }) => (
              <>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <SmallChoice
                    key={day}
                    label={day.slice(0, 3)}
                    selected={field.value?.includes(day)}
                    onClick={() => {
                      const current = field.value || [];
                      if (current.includes(day)) {
                        field.onChange(
                          current.filter((d: string) => d !== day),
                        );
                      } else {
                        field.onChange([...current, day]);
                      }
                    }}
                  />
                ))}
              </>
            )}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Controller
            control={form.control}
            name="preferredDuration"
            render={({ field }) => (
              <>
                {[30, 45, 60].map((minutes) => (
                  <SmallChoice
                    key={minutes}
                    label={`${minutes} minutes`}
                    selected={field.value === minutes}
                    onClick={() => field.onChange(minutes)}
                  />
                ))}
              </>
            )}
          />
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Or set an exact visit length
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Hours
              <input
                type="number"
                min={0}
                max={4}
                value={Math.floor(preferredDuration / 60)}
                onChange={(event) => {
                  const hours = Number(event.target.value);
                  const minutes = preferredDuration % 60;
                  form.setValue("preferredDuration", hours * 60 + minutes, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Minutes
              <input
                type="number"
                min={0}
                max={59}
                value={preferredDuration % 60}
                onChange={(event) => {
                  const minutes = Number(event.target.value);
                  const hours = Math.floor(preferredDuration / 60);
                  form.setValue("preferredDuration", hours * 60 + minutes, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
            <span className="pb-2 text-xs text-slate-500 dark:text-slate-400">
              {preferredDuration} minutes total
            </span>
          </div>
          {form.formState.errors.preferredDuration && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">
              Choose between 15 minutes and 4 hours.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Cardio preferences
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Should we incorporate cardiovascular exercises into your plan?
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Controller
            control={form.control}
            name="includeCardio"
            render={({ field }) => (
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="includeCardio"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <label
                  htmlFor="includeCardio"
                  className="cursor-pointer text-sm leading-none font-medium text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300"
                >
                  Yes, include cardio exercises
                </label>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
