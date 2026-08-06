"use client";

import { useTransition, useOptimistic } from "react";
import { Check, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  toggleSetCompleted,
  finishWorkoutSession,
  clearActiveSession,
} from "@/actions/tracker";

type Set = {
  id: string;
  setNumber: number;
  completed: boolean;
};

type Exercise = {
  id: string;
  exerciseName: string;
  section: string | null;
  stickyNote: string | null;
  sets: Set[];
};

type Session = {
  id: string;
  name: string;
  completedAt: Date | null;
  exercises: Exercise[];
};

type OriginalExerciseDetail = {
  name: string;
  equipment?: string;
  setsAndReps: string;
  notes?: string;
  instructions?: string[];
};

type OriginalPlan = {
  warmup?: OriginalExerciseDetail[];
  mainWorkout?: OriginalExerciseDetail[];
  cardio?: OriginalExerciseDetail[];
  cooldown?: OriginalExerciseDetail[];
};

export function ExerciseTracker({
  session,
  originalPlan,
}: {
  session: Session;
  originalPlan: OriginalPlan | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSession, addOptimisticSetToggle] = useOptimistic(
    session,
    (state, { setId, completed }: { setId: string; completed: boolean }) => {
      return {
        ...state,
        exercises: state.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed } : s)),
        })),
      };
    },
  );

  const originalDetails = new Map<string, OriginalExerciseDetail>();
  if (originalPlan) {
    const all = [
      ...(originalPlan.warmup || []),
      ...(originalPlan.mainWorkout || []),
      ...(originalPlan.cardio || []),
      ...(originalPlan.cooldown || []),
    ];
    all.forEach((ex) => originalDetails.set(ex.name, ex));
  }

  const handleToggle = (setId: string, completed: boolean) => {
    startTransition(async () => {
      addOptimisticSetToggle({ setId, completed });
      try {
        await toggleSetCompleted(setId, completed);
      } catch {
        toast.error("Failed to save progress");
      }
    });
  };

  const handleFinish = () => {
    startTransition(async () => {
      try {
        await finishWorkoutSession(session.id);
        toast.success("Workout completed!");
      } catch {
        toast.error("Failed to finish workout");
      }
    });
  };

  const handleClear = () => {
    if (
      !window.confirm(
        "Are you sure you want to clear this workout session? Your progress will be lost.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await clearActiveSession(session.id);
      } catch {
        toast.error("Failed to clear session");
      }
    });
  };

  const sections = ["Warm-up", "Main Workout", "Cardio", "Cool-down"];
  const totalSets = optimisticSession.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0,
  );
  const completedSets = optimisticSession.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const progressPercent =
    totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700 ease-out">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:flex-row sm:items-center dark:border-slate-800/60 dark:bg-slate-900/50">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            Your Progress
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {completedSets} of {totalSets} sets completed
          </p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-1/3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
            {progressPercent}%
          </span>
        </div>
      </div>

      <div className="space-y-10">
        {sections.map((sectionName) => {
          const exercises = optimisticSession.exercises.filter(
            (ex) => ex.section === sectionName,
          );
          if (exercises.length === 0) return null;

          return (
            <div key={sectionName} className="space-y-4">
              <h4 className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
                {sectionName}
              </h4>
              <div className="space-y-3">
                {exercises.map((ex) => {
                  const details = originalDetails.get(ex.exerciseName);
                  const isAllSetsCompleted =
                    ex.sets.length > 0 && ex.sets.every((s) => s.completed);

                  return (
                    <div
                      key={ex.id}
                      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-5 ${
                        isAllSetsCompleted
                          ? "border-slate-200/50 bg-slate-50/50 opacity-80 dark:border-slate-800/50 dark:bg-slate-900/20"
                          : "border-slate-200 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/50"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <h5
                            className={`text-lg font-semibold transition-colors ${
                              isAllSetsCompleted
                                ? "text-slate-500 line-through decoration-slate-300"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {ex.exerciseName}
                          </h5>
                          {details?.setsAndReps && (
                            <p className="mt-1 text-sm text-slate-500">
                              {details.setsAndReps}
                            </p>
                          )}
                          {ex.stickyNote && (
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {ex.stickyNote}
                            </p>
                          )}

                          {details?.instructions &&
                            details.instructions.length > 0 && (
                              <div className="mt-3">
                                <Dialog>
                                  <DialogTrigger className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                    <PlayCircle className="size-4" />
                                    How to perform
                                  </DialogTrigger>
                                  <DialogContent className="flex max-h-[90vh] w-[90vw] max-w-4xl flex-col overflow-hidden border-slate-200/50 bg-white/95 shadow-2xl backdrop-blur-xl sm:rounded-2xl dark:border-slate-800/50 dark:bg-slate-950/95">
                                    <DialogHeader className="sticky top-0 z-10 -mt-2 bg-white/95 pt-2 pb-4 backdrop-blur-xl dark:bg-slate-950/95">
                                      <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                                        {ex.exerciseName}
                                      </DialogTitle>
                                      <DialogDescription className="font-medium text-slate-500">
                                        Official execution guide
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 space-y-6 overflow-y-auto pr-1 sm:pr-2">
                                      <div>
                                        <Badge
                                          variant="secondary"
                                          className="bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
                                        >
                                          {details.equipment}
                                        </Badge>
                                      </div>
                                      <div className="space-y-3 pb-2">
                                        {details.instructions.map((step, i) => {
                                          const cleanStep = step.replace(
                                            /^\d+\.\s*/,
                                            "",
                                          );
                                          return (
                                            <div
                                              key={i}
                                              className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-slate-200 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-slate-700"
                                            >
                                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 dark:group-hover:ring-blue-800">
                                                {i + 1}
                                              </div>
                                              <p className="pt-0.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
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

                        <div className="flex w-full pt-4 sm:w-auto sm:pt-0">
                          {(() => {
                            const completedCount = ex.sets.filter(
                              (s) => s.completed,
                            ).length;
                            const totalSets = ex.sets.length;
                            const isDone = completedCount === totalSets;

                            const handleProgressClick = () => {
                              if (isPending) return;
                              if (isDone) {
                                // Undo the last completed set
                                const lastCompleted = [...ex.sets]
                                  .reverse()
                                  .find((s) => s.completed);
                                if (lastCompleted)
                                  handleToggle(lastCompleted.id, false);
                              } else {
                                // Complete the first uncompleted set
                                const firstUncompleted = ex.sets.find(
                                  (s) => !s.completed,
                                );
                                if (firstUncompleted)
                                  handleToggle(firstUncompleted.id, true);
                              }
                            };

                            return (
                              <button
                                onClick={handleProgressClick}
                                disabled={isPending}
                                className={`relative flex h-12 w-full items-center justify-center overflow-hidden rounded-full border font-bold transition-all active:scale-95 sm:w-48 ${
                                  isDone
                                    ? "border-blue-500 bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                                } ${isPending ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                              >
                                {/* Progress Fill Background */}
                                {!isDone && (
                                  <div
                                    className="absolute top-0 bottom-0 left-0 bg-blue-100 transition-all duration-300 ease-out dark:bg-blue-900/40"
                                    style={{
                                      width: `${(completedCount / totalSets) * 100}%`,
                                    }}
                                  />
                                )}

                                {/* Button Text */}
                                <span className="relative z-10 flex items-center gap-2">
                                  {isDone ? (
                                    <>
                                      <Check className="size-5" /> Completed
                                    </>
                                  ) : (
                                    `${completedCount} / ${totalSets} Sets`
                                  )}
                                </span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200/60 pt-8 sm:flex-row dark:border-slate-800/60">
        <Button
          variant="ghost"
          className="text-slate-500 transition-colors hover:text-red-600"
          onClick={handleClear}
          disabled={isPending}
        >
          Clear Session
        </Button>
        <Button
          onClick={handleFinish}
          disabled={isPending || progressPercent !== 100}
          className={`h-12 rounded-xl px-8 transition-all duration-500 ${
            progressPercent === 100
              ? "bg-blue-600 shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:bg-blue-700"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Complete Workout
        </Button>
      </div>
    </div>
  );
}
