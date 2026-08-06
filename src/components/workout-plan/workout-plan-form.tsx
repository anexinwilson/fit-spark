"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getUserEquipment } from "@/actions/equipment";
import {
  type WorkoutPlanDraft,
  type WorkoutPlanInput,
  type WorkoutPlanResponse,
  workoutPlanSchema,
} from "@/lib/workout-plan/schema";
import { WorkoutPlanResult } from "@/components/workout-plan/workout-plan-result";
import { WorkoutPlanLoading } from "@/components/workout-plan/workout-plan-loading";
import { cn } from "@/lib/utils";

import { StepGoal } from "@/components/workout-plan/step-goal";
import { StepExperience } from "@/components/workout-plan/step-experience";
import { StepEquipment } from "@/components/workout-plan/step-equipment";

const steps = ["Your goal", "Your experience", "Equipment & safety"] as const;

export const limitationOptions = [
  "Knee or leg discomfort",
  "Back discomfort",
  "Shoulder or arm discomfort",
  "Avoid jumping or high-impact movement",
  "Avoid overhead movement",
] as const;

async function generateWorkoutPlan(
  input: WorkoutPlanInput,
  onStatusUpdate?: (status: string, node?: string) => void,
  onLogUpdate?: (line: string) => void,
): Promise<WorkoutPlanResponse> {
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? "Unable to create your workout plan");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream available");
  const decoder = new TextDecoder();

  let result: WorkoutPlanResponse | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(jsonStr) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (typeof data.error === "string") {
        throw new Error(data.error);
      }
      if (typeof data.status === "string" && onStatusUpdate) {
        onStatusUpdate(
          data.status,
          typeof data.node === "string" ? data.node : undefined,
        );
      }
      if (typeof data.log === "string" && onLogUpdate) {
        onLogUpdate(data.log);
      }
      if (data.complete) {
        result = data as WorkoutPlanResponse;
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const jsonStr = buffer.trim().slice(5).trim();
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.error) throw new Error(data.error);
        if (data.status && onStatusUpdate)
          onStatusUpdate(data.status, data.node);
        if (data.log && onLogUpdate) onLogUpdate(data.log);
        if (data.complete) result = data as WorkoutPlanResponse;
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.length > 0 &&
          !e.message.includes("JSON")
        )
          throw e;
      }
    }
  }

  if (!result) throw new Error("Stream closed before completing the plan");
  return result;
}

type SavedDraft = WorkoutPlanDraft & { updatedAt: string };

async function getWorkoutPlanDraft(): Promise<{ draft: SavedDraft | null }> {
  const response = await fetch("/api/workout-plan/draft");
  const data = (await response.json()) as {
    draft?: SavedDraft | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load your planning draft");
  }
  return { draft: data.draft ?? null };
}

async function saveWorkoutPlanDraft(
  draft: WorkoutPlanDraft,
): Promise<{ draft: SavedDraft }> {
  const response = await fetch("/api/workout-plan/draft", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = (await response.json()) as {
    draft?: SavedDraft;
    error?: string;
  };
  if (!response.ok || !data.draft) {
    throw new Error(data.error ?? "Unable to save your planning progress");
  }
  return { draft: data.draft };
}

async function deleteWorkoutPlanDraft(): Promise<void> {
  const response = await fetch("/api/workout-plan/draft", { method: "DELETE" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Unable to clear your planning draft");
  }
}

export function WorkoutPlanForm({
  initialPlan,
}: {
  initialPlan?: WorkoutPlanResponse["workoutPlan"];
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedStep = Number(searchParams.get("step"));
  const [step, setStep] = useState(
    Number.isInteger(requestedStep) &&
      requestedStep >= 0 &&
      requestedStep < steps.length
      ? requestedStep
      : 0,
  );
  const [activePlan, setActivePlan] = useState(initialPlan);
  const [activeCoachInsight, setActiveCoachInsight] =
    useState<WorkoutPlanResponse["coachInsight"]>(undefined);
  const [equipmentAliases, setEquipmentAliases] = useState<string[]>([]);
  const [includeBodyweight, setIncludeBodyweight] = useState(false);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentLoadError, setEquipmentLoadError] = useState<string | null>(
    null,
  );
  const [customLimitation, setCustomLimitation] = useState("");

  const [activeNodeId, setActiveNodeId] = useState("equipmentResolver");
  const [generationStatus, setGenerationStatus] = useState(
    "Resolving equipment...",
  );
  const [logLines, setLogLines] = useState<string[]>([]);

  const form = useForm<WorkoutPlanInput>({
    resolver: zodResolver(workoutPlanSchema),
    defaultValues: {
      fitnessGoal: "",
      experienceLevel: "beginner",
      preferredDuration: 45,
      includeCardio: false,
      equipment: "",
      limitations: "",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
    },
  });

  const limitationValue =
    useWatch({ control: form.control, name: "limitations" }) ?? "";
  const selectedLimitations = limitationValue
    .split("; ")
    .filter((value) => value.length > 0);

  const draftQuery = useQuery({
    queryKey: ["workout-plan-draft"],
    queryFn: getWorkoutPlanDraft,
    staleTime: 30_000,
  });

  const draftMutation = useMutation({
    mutationFn: saveWorkoutPlanDraft,
    onSuccess: (data) => {
      queryClient.setQueryData(["workout-plan-draft"], data);
    },
  });

  const clearDraftMutation = useMutation({
    mutationFn: deleteWorkoutPlanDraft,
    onSuccess: () => {
      queryClient.setQueryData(["workout-plan-draft"], { draft: null });
    },
  });

  useEffect(() => {
    getUserEquipment()
      .then((aliases) => {
        const hasBw = aliases.some((a) => a.toLowerCase() === "bodyweight");
        setIncludeBodyweight(hasBw);
        const filtered = aliases.filter(
          (a) => a.toLowerCase() !== "bodyweight",
        );
        setEquipmentAliases(filtered);

        form.setValue("equipment", aliases.join(", "), {
          shouldDirty: false,
          shouldValidate: true,
        });
      })
      .catch(() =>
        setEquipmentLoadError(
          "We could not load your selected equipment. Refresh and try again.",
        ),
      )
      .finally(() => setEquipmentLoading(false));
  }, [form]);

  useEffect(() => {
    const draft = draftQuery.data?.draft;
    if (!draft) return;

    form.reset({
      preferredDuration: 45,
      includeCardio: false,
      equipment: form.getValues("equipment") || "",
      trainingDays: ["Monday", "Wednesday", "Friday"],
      ...draft.input,
    });
    if (
      !Number.isInteger(requestedStep) ||
      requestedStep < 0 ||
      requestedStep >= steps.length
    ) {
      queueMicrotask(() => setStep(draft.step));
    }
  }, [draftQuery.data?.draft, form, requestedStep]);

  const generation = useMutation({
    mutationFn: (input: WorkoutPlanInput) => {
      setLogLines([]);
      setActiveNodeId("equipmentResolver");
      setGenerationStatus("Resolving equipment...");
      return generateWorkoutPlan(
        input,
        (status, node) => {
          if (status) setGenerationStatus(status);
          if (node) setActiveNodeId(node);
        },
        (line) => setLogLines((prev) => [...prev, line]),
      );
    },
    onSuccess: (response) => {
      setActivePlan(response.workoutPlan);
      setActiveCoachInsight(response.coachInsight);
      void clearDraftMutation.mutateAsync();
      setGenerationStatus("Resolving equipment...");
      setLogLines([]);
    },
    onError: () => {},
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, generation.isPending]);

  const draftInput = (): WorkoutPlanDraft["input"] => {
    const values = form.getValues();
    return {
      fitnessGoal: values.fitnessGoal,
      experienceLevel: values.experienceLevel,
      preferredDuration: values.preferredDuration,
      includeCardio: values.includeCardio,
      limitations: form.getValues("limitations"),
      trainingDays: values.trainingDays,
    };
  };

  const nextStep = async () => {
    const fields = step === 0 ? ["fitnessGoal"] : ["experienceLevel"];
    const valid = await form.trigger(fields as Array<keyof WorkoutPlanInput>, {
      shouldFocus: true,
    });
    if (valid) {
      const nextStep = Math.min(step + 1, steps.length - 1);
      draftMutation.mutate(
        { step: nextStep, input: draftInput() },
        { onSuccess: () => setStep(nextStep) },
      );
    }
  };

  const toggleLimitation = (limitation: string) => {
    const next = selectedLimitations.includes(limitation)
      ? selectedLimitations.filter((item) => item !== limitation)
      : [...selectedLimitations, limitation];
    form.setValue("limitations", next.join("; "), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const addCustomLimitation = () => {
    const value = customLimitation.trim();
    if (!value || selectedLimitations.includes(value)) return;
    form.setValue("limitations", [...selectedLimitations, value].join("; "), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setCustomLimitation("");
  };

  const submitPlan = (input: WorkoutPlanInput) => {
    const finalEquip = [
      ...equipmentAliases,
      ...(includeBodyweight ? ["Bodyweight"] : []),
    ];
    if (finalEquip.length === 0) {
      form.setError("equipment", {
        message: "Choose at least one equipment item before building a plan.",
      });
      return;
    }

    generation.mutate({
      ...input,
      equipment: finalEquip.join(", "),
      limitations: form.getValues("limitations"),
    });
  };

  const continueToEquipment = () => {
    draftMutation.mutate(
      { step: 2, input: draftInput() },
      {
        onSuccess: () =>
          window.location.assign("/explore?returnTo=workoutplan"),
      },
    );
  };

  const draftError =
    draftQuery.error ?? draftMutation.error ?? clearDraftMutation.error;

  if (activePlan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8 duration-1000">
        <WorkoutPlanResult
          plan={activePlan}
          coachInsight={activeCoachInsight}
        />

        <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <a
            href="/today"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-14 w-full rounded-full bg-blue-600 px-12 text-lg font-semibold shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-700 hover:shadow-[0_0_60px_-10px_rgba(37,99,235,0.7)] sm:w-auto",
            )}
          >
            Start Today's Workout
            <ArrowRight aria-hidden="true" className="ml-2 size-5" />
          </a>
          <Button
            variant="outline"
            className="h-14 w-full rounded-full border border-white/30 bg-white/10 px-8 text-lg font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)] sm:w-auto"
            onClick={() => {
              generation.reset();
              setActivePlan(undefined);
              setStep(0);
            }}
          >
            Build a new plan
          </Button>
        </div>
      </div>
    );
  }

  if (generation.isPending) {
    return (
      <WorkoutPlanLoading
        activeNodeId={activeNodeId}
        statusMessage={generationStatus}
        logLines={logLines}
      />
    );
  }

  if (generation.isError) {
    const errorMessage =
      generation.error?.message ||
      "An unexpected error occurred while generating your plan.";
    const isQuotaError =
      errorMessage.includes("Quota") ||
      errorMessage.includes("429") ||
      errorMessage.includes("limit") ||
      errorMessage.includes("API Quota");

    return (
      <Card className="overflow-hidden border-red-200 shadow-xl shadow-red-950/5 dark:border-red-900/50">
        <CardHeader className="border-b bg-red-50/60 p-6 sm:p-8 dark:bg-red-950/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                <AlertCircle className="size-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
                    Generation Failed
                  </CardTitle>
                  <Badge variant="destructive" className="font-semibold">
                    {isQuotaError ? "HTTP 429 Quota" : "Error"}
                  </Badge>
                </div>
                <CardDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {isQuotaError
                    ? "API request limit reached. Please check details below."
                    : "An issue occurred while building your customized workout plan."}
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700 sm:self-center"
              onClick={() => {
                generation.reset();
                submitPlan(form.getValues());
              }}
            >
              Retry Generation
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-4 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="text-xs font-semibold tracking-wider text-red-900 uppercase dark:text-red-200">
              Error Message
            </p>
            <p className="mt-1 text-sm font-medium text-red-800 dark:text-red-300">
              {errorMessage}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Execution Log & Node Status
              </p>
              <Badge variant="outline" className="font-mono text-xs">
                {activeNodeId || "failed"}
              </Badge>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last recorded node status:
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                {generationStatus || "Resolving equipment..."}
              </p>
            </div>
            {logLines.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-inner">
                <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-xs font-medium text-slate-400">
                    Preserved Token Stream Log
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {logLines.length} entries
                  </span>
                </div>
                <pre className="max-h-52 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
                  {logLines.join("\n")}
                </pre>
              </div>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-white/5 bg-black/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Need to adjust options? You can modify form fields or retry building
            your plan.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                generation.reset();
              }}
            >
              Modify Form
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                generation.reset();
                submitPlan(form.getValues());
              }}
            >
              Retry Generation
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 animate-in fade-in slide-in-from-bottom-10 overflow-hidden border-white/5 shadow-2xl backdrop-blur-3xl duration-700">
      <CardHeader className="border-b border-white/5 bg-black/20 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 h-2 w-full rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${Math.round(((step + 1) / 3) * 100)}%` }}
            />
          </div>
          <span className="text-primary text-sm font-medium">
            {Math.round(((step + 1) / 3) * 100)}%
          </span>
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            Step {step + 1} of 3
          </p>
          <CardTitle className="mt-2 text-3xl font-black tracking-tighter italic sm:text-5xl">
            {steps[step]}
          </CardTitle>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
            Your answers and selected equipment will be used to build your plan.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 sm:px-8 sm:pt-0 sm:pb-8">
        <form onSubmit={form.handleSubmit(submitPlan)}>
          {step === 0 && <StepGoal form={form} />}
          {step === 1 && <StepExperience form={form} />}
          {step === 2 && (
            <StepEquipment
              form={form}
              equipmentLoading={equipmentLoading}
              equipmentLoadError={equipmentLoadError}
              equipmentAliases={equipmentAliases}
              includeBodyweight={includeBodyweight}
              setIncludeBodyweight={setIncludeBodyweight}
              continueToEquipment={continueToEquipment}
              draftMutationIsPending={draftMutation.isPending}
              selectedLimitations={selectedLimitations}
              limitationOptions={limitationOptions}
              toggleLimitation={toggleLimitation}
              customLimitation={customLimitation}
              setCustomLimitation={setCustomLimitation}
              addCustomLimitation={addCustomLimitation}
            />
          )}

          {draftError && (
            <div
              role="alert"
              className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              {draftError.message}
            </div>
          )}

          <div
            className={cn(
              "mt-8 flex gap-3",
              step === 0 ? "justify-end" : "justify-between",
            )}
          >
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={nextStep}
              >
                Continue
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  generation.isPending ||
                  equipmentLoading ||
                  Boolean(equipmentLoadError)
                }
              >
                {generation.isPending && <Loader2 className="animate-spin" />}
                {generation.isPending ? generationStatus : "Build my plan"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
