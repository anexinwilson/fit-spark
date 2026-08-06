import { Controller, type UseFormReturn } from "react-hook-form";
import { type WorkoutPlanInput } from "@/lib/workout-plan/schema";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ChoiceCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex w-full cursor-pointer items-start justify-between rounded-2xl border-2 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]",
        selected
          ? "border-blue-600 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-950/40"
          : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900/60",
      )}
    >
      <span>
        <span
          className={cn(
            "block text-sm font-semibold",
            selected
              ? "text-blue-800 dark:text-blue-200"
              : "text-slate-800 dark:text-slate-100",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 text-transparent dark:border-slate-600",
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
      </span>
    </button>
  );
}

export function StepGoal({ form }: { form: UseFormReturn<WorkoutPlanInput> }) {
  return (
    <Controller
      control={form.control}
      name="fitnessGoal"
      render={({ field, fieldState }) => (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              What do you want help with first?
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose the outcome that matters most right now.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "build confidence",
                "Build confidence",
                "Know what to do at the gym",
              ],
              ["build muscle", "Build muscle", "Get stronger over time"],
              ["improve health", "Improve health", "Move more and feel better"],
              ["lose fat", "Manage weight", "Build a consistent routine"],
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
          {fieldState.error && (
            <p className="text-destructive text-sm">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
