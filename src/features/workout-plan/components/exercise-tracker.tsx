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
import { toggleSetCompleted, finishWorkoutSession, clearActiveSession } from "../server/tracker-actions";

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
  equipment: string;
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
    }
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
    if (!window.confirm("Are you sure you want to clear this workout session? Your progress will be lost.")) return;
    startTransition(async () => {
      try {
        await clearActiveSession(session.id);
      } catch {
        toast.error("Failed to clear session");
      }
    });
  };

  const sections = ["Warm-up", "Main Workout", "Cardio", "Cool-down"];
  const totalSets = optimisticSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = optimisticSession.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
  const progressPercent = totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Your Progress</h3>
          <p className="text-sm text-slate-500 mt-1">
            {completedSets} of {totalSets} sets completed
          </p>
        </div>
        <div className="w-full sm:w-1/3 flex items-center gap-3">
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-right">
            {progressPercent}%
          </span>
        </div>
      </div>

      <div className="space-y-10">
        {sections.map((sectionName) => {
          const exercises = optimisticSession.exercises.filter((ex) => ex.section === sectionName);
          if (exercises.length === 0) return null;

          return (
            <div key={sectionName} className="space-y-4">
              <h4 className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
                {sectionName}
              </h4>
              <div className="space-y-3">
                {exercises.map((ex) => {
                  const details = originalDetails.get(ex.exerciseName);
                  const isAllSetsCompleted = ex.sets.length > 0 && ex.sets.every((s) => s.completed);

                  return (
                    <div
                      key={ex.id}
                      className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
                        isAllSetsCompleted
                          ? "bg-slate-50/50 border-slate-200/50 dark:bg-slate-900/20 dark:border-slate-800/50 opacity-80"
                          : "bg-white border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-slate-900/50 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <h5
                            className={`font-semibold text-lg transition-colors ${
                              isAllSetsCompleted ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {ex.exerciseName}
                          </h5>
                          {details?.setsAndReps && (
                            <p className="text-sm text-slate-500 mt-1">{details.setsAndReps}</p>
                          )}
                          {ex.stickyNote && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                              {ex.stickyNote}
                            </p>
                          )}

                          {details?.instructions && details.instructions.length > 0 && (
                            <div className="mt-3">
                              <Dialog>
                                <DialogTrigger className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                  <PlayCircle className="size-4" />
                                  How to perform
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl bg-white/95 dark:bg-slate-950/95 shadow-2xl border-slate-200/50 dark:border-slate-800/50 sm:rounded-2xl">
                                  <DialogHeader className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 pb-4 backdrop-blur-xl -mt-2 pt-2">
                                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">{ex.exerciseName}</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">Official execution guide</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6 flex-1 overflow-y-auto pr-1 sm:pr-2">
                                    <div>
                                      <Badge variant="secondary" className="shadow-sm py-1.5 px-3 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40">
                                        {details.equipment}
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 pb-2">
                                      {details.instructions.map((step, i) => {
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

                        <div className="flex w-full sm:w-auto pt-4 sm:pt-0">
                          {(() => {
                            const completedCount = ex.sets.filter(s => s.completed).length;
                            const totalSets = ex.sets.length;
                            const isDone = completedCount === totalSets;
                            
                            const handleProgressClick = () => {
                              if (isPending) return;
                              if (isDone) {
                                // Undo the last completed set
                                const lastCompleted = [...ex.sets].reverse().find(s => s.completed);
                                if (lastCompleted) handleToggle(lastCompleted.id, false);
                              } else {
                                // Complete the first uncompleted set
                                const firstUncompleted = ex.sets.find(s => !s.completed);
                                if (firstUncompleted) handleToggle(firstUncompleted.id, true);
                              }
                            };

                            return (
                              <button
                                onClick={handleProgressClick}
                                disabled={isPending}
                                className={`relative overflow-hidden h-12 w-full sm:w-48 rounded-full font-bold flex items-center justify-center transition-all active:scale-95 border ${
                                  isDone 
                                    ? "border-blue-500 bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                                } ${isPending ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {/* Progress Fill Background */}
                                {!isDone && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 bg-blue-100 dark:bg-blue-900/40 transition-all duration-300 ease-out"
                                    style={{ width: `${(completedCount / totalSets) * 100}%` }}
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
        <Button variant="ghost" className="text-slate-500 hover:text-red-600 transition-colors" onClick={handleClear} disabled={isPending}>
          Clear Session
        </Button>
        <Button
          onClick={handleFinish}
          disabled={isPending || progressPercent !== 100}
          className={`px-8 h-12 rounded-xl transition-all duration-500 ${
            progressPercent === 100
              ? "bg-blue-600 hover:bg-blue-700 shadow-[0_8px_30px_rgb(37,99,235,0.3)]"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Complete Workout
        </Button>
      </div>
    </div>
  );
}
