import { type UseFormReturn } from "react-hook-form";
import { type WorkoutPlanInput } from "@/lib/workout-plan/schema";
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export function StepEquipment({
  form,
  equipmentLoading,
  equipmentLoadError,
  equipmentAliases,
  includeBodyweight,
  setIncludeBodyweight,
  continueToEquipment,
  draftMutationIsPending,
  selectedLimitations,
  limitationOptions,
  toggleLimitation,
  customLimitation,
  setCustomLimitation,
  addCustomLimitation,
}: {
  form: UseFormReturn<WorkoutPlanInput>;
  equipmentLoading: boolean;
  equipmentLoadError: string | null;
  equipmentAliases: string[];
  includeBodyweight: boolean;
  setIncludeBodyweight: (val: boolean) => void;
  continueToEquipment: () => void;
  draftMutationIsPending: boolean;
  selectedLimitations: string[];
  limitationOptions: readonly string[];
  toggleLimitation: (limitation: string) => void;
  customLimitation: string;
  setCustomLimitation: (val: string) => void;
  addCustomLimitation: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Equipment selected for your plan
            </p>
            <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">
              FitSpark will use these items when planning your sessions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-blue-300 bg-white dark:bg-slate-950"
            onClick={continueToEquipment}
            disabled={draftMutationIsPending}
          >
            <Plus className="size-4" aria-hidden="true" />
            Change equipment
          </Button>
        </div>
        {equipmentLoading ? (
          <p className="mt-4 text-sm text-blue-800/70 dark:text-blue-200/70">
            Loading your selected equipment...
          </p>
        ) : equipmentLoadError ? (
          <p
            role="alert"
            className="mt-4 text-sm text-red-700 dark:text-red-300"
          >
            {equipmentLoadError}
          </p>
        ) : equipmentAliases.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {equipmentAliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                >
                  <Check
                    className="size-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                  {alias}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="includeBodyweight"
                  checked={includeBodyweight}
                  onCheckedChange={(checked) =>
                    setIncludeBodyweight(checked === true)
                  }
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="includeBodyweight"
                    className="cursor-pointer text-sm leading-none font-medium text-slate-700 dark:text-slate-300"
                  >
                    Include Bodyweight exercises
                  </label>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Essential for a well-rounded plan. Select this if you lack
                    other equipment.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-white/80 p-4 dark:border-blue-800 dark:bg-slate-950/50">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Choose equipment before building your plan
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Select the machines, weights, or tools you can use in Explore.
            </p>
            <Button
              type="button"
              className="mt-3 bg-blue-600 hover:bg-blue-700"
              onClick={continueToEquipment}
              disabled={draftMutationIsPending}
            >
              Choose equipment
            </Button>
          </div>
        )}
        {form.formState.errors.equipment && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300">
            {form.formState.errors.equipment.message}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Anything you want to avoid?
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose any that apply. You can add your own note below.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {limitationOptions.map((limitation) => {
            const selected = selectedLimitations.includes(limitation);
            return (
              <button
                key={limitation}
                type="button"
                onClick={() => toggleLimitation(limitation)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
                )}
              >
                {limitation}
                {selected && <Check className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {selectedLimitations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedLimitations.map((limitation) => (
              <button
                key={limitation}
                type="button"
                onClick={() => toggleLimitation(limitation)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {limitation}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            id="custom-limitation"
            rows={2}
            value={customLimitation}
            onChange={(event) => setCustomLimitation(event.target.value)}
            placeholder="Add another movement or health consideration"
            className="min-h-12 resize-none bg-white dark:bg-slate-900"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomLimitation}
            className="gap-2 sm:self-end"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          This helps FitSpark avoid unsuitable movements. It is not medical
          advice.
        </p>
      </div>
    </div>
  );
}
