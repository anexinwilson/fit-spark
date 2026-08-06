"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getUserEquipment } from "@/features/equipment/actions";
import {
  type WorkoutPlanDraft,
  type WorkoutPlanInput,
  type WorkoutPlanResponse,
  workoutPlanSchema,
} from "@/features/workout-plan/schema";
import { WorkoutPlanResult } from "@/features/workout-plan/workout-plan-result";
import { WorkoutPlanLoading } from "@/features/workout-plan/components/workout-plan-loading";
import { cn } from "@/lib/utils";

const steps = ["Your goal", "Your experience", "Equipment & safety"] as const;

const limitationOptions = [
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

function ChoiceCard({
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

function SmallChoice({
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
      workoutType: "strength",
      fitnessGoal: "",
      experienceLevel: "beginner",
      preferredDuration: 45,
      includeCardio: false,
      ageRange: "",
      equipment: "",
      limitations: "",
      daysPerWeek: 3,
    },
  });
  const limitationValue =
    useWatch({ control: form.control, name: "limitations" }) ?? "";
  const preferredDuration =
    useWatch({ control: form.control, name: "preferredDuration" }) ?? 45;
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
      workoutType: "strength",
      preferredDuration: 45,
      includeCardio: false,
      ageRange: "",
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
      void clearDraftMutation.mutateAsync();
      setGenerationStatus("Resolving equipment...");
      setLogLines([]);
    },
    onError: () => {},
  });

  const draftInput = (): WorkoutPlanDraft["input"] => {
    const values = form.getValues();
    return {
      workoutType: values.workoutType,
      fitnessGoal: values.fitnessGoal,
      experienceLevel: values.experienceLevel,
      preferredDuration: values.preferredDuration,
      includeCardio: values.includeCardio,
      ageRange: values.ageRange,
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
      <div className="space-y-6">
        <WorkoutPlanResult plan={activePlan} />
        <Button
          variant="outline"
          onClick={() => {
            generation.reset();
            setActivePlan(undefined);
            setStep(0);
          }}
        >
          Build a new plan
        </Button>
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
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

        <CardFooter className="flex flex-col gap-3 border-t bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900/40">
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
    <Card className="overflow-hidden border-slate-200/80 shadow-xl shadow-blue-950/5 dark:border-slate-800">
      <CardHeader className="border-b bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 sm:p-8 dark:from-blue-950/40 dark:via-slate-900 dark:to-cyan-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">
              Step {step + 1} of {steps.length}
            </p>
            <CardTitle className="mt-2 text-2xl tracking-tight sm:text-3xl">
              {steps[step]}
            </CardTitle>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              Your answers and selected equipment will be used to build your
              plan.
            </p>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm dark:bg-slate-900/80 dark:text-blue-300">
            {Math.round(((step + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8">
        <form onSubmit={form.handleSubmit(submitPlan)}>
          {step === 0 && (
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
                      [
                        "build muscle",
                        "Build muscle",
                        "Get stronger over time",
                      ],
                      [
                        "improve health",
                        "Improve health",
                        "Move more and feel better",
                      ],
                      [
                        "lose fat",
                        "Manage weight",
                        "Build a consistent routine",
                      ],
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
          )}

          {step === 1 && (
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
                        [
                          "intermediate",
                          "Some experience",
                          "I know the basics",
                        ],
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50">
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
                          form.setValue(
                            "preferredDuration",
                            hours * 60 + minutes,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
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
                          form.setValue(
                            "preferredDuration",
                            hours * 60 + minutes,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50">
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
          )}

          {step === 2 && (
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
                    disabled={draftMutation.isPending}
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
                            Essential for a well-rounded plan. Select this if
                            you lack other equipment.
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
                      Select the machines, weights, or tools you can use in
                      Explore.
                    </p>
                    <Button
                      type="button"
                      className="mt-3 bg-blue-600 hover:bg-blue-700"
                      onClick={continueToEquipment}
                      disabled={draftMutation.isPending}
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
                        {selected && (
                          <Check className="size-4" aria-hidden="true" />
                        )}
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
                    onChange={(event) =>
                      setCustomLimitation(event.target.value)
                    }
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
                  This helps FitSpark avoid unsuitable movements. It is not
                  medical advice.
                </p>
              </div>
            </div>
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
