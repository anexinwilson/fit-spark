"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type WorkoutPlanInput,
  type WorkoutPlanResponse,
  workoutPlanSchema,
} from "@/features/workout-plan/schema";
import { WorkoutPlanResult } from "@/features/workout-plan/workout-plan-result";
import { cn } from "@/lib/utils";

const steps = ["Goal", "Schedule", "Equipment & safety"] as const;

const stepFields: Array<Array<keyof WorkoutPlanInput>> = [
  ["workoutType", "fitnessGoal"],
  [
    "experienceLevel",
    "preferredDuration",
    "daysPerWeek",
    "ageRange",
    "includeCardio",
  ],
  ["equipment", "limitations"],
];

async function generateWorkoutPlan(
  input: WorkoutPlanInput,
): Promise<WorkoutPlanResponse> {
  const response = await fetch("/api/generate-workoutplan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as WorkoutPlanResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to create your workout plan");
  }

  return data;
}

type Choice = { value: string; label: string };

function FormSelect({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  choices,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  choices: Choice[];
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onValueChange(next ?? "")}>
        <SelectTrigger
          id={id}
          className="h-11 w-full"
          aria-invalid={Boolean(error)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function WorkoutPlanForm() {
  const [step, setStep] = useState(0);
  const form = useForm<WorkoutPlanInput>({
    resolver: zodResolver(workoutPlanSchema),
    defaultValues: {
      workoutType: "",
      fitnessGoal: "",
      experienceLevel: "beginner",
      preferredDuration: 30,
      includeCardio: true,
      ageRange: "",
      equipment: "",
      limitations: "",
      daysPerWeek: 3,
    },
  });
  const generation = useMutation({ mutationFn: generateWorkoutPlan });

  const nextStep = async () => {
    const valid = await form.trigger(stepFields[step], { shouldFocus: true });
    if (valid) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  if (generation.data?.workoutPlan) {
    return (
      <div className="space-y-6">
        <WorkoutPlanResult plan={generation.data.workoutPlan} />
        <Button
          variant="outline"
          onClick={() => {
            generation.reset();
            setStep(0);
          }}
        >
          Adjust my answers
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Step {step + 1} of {steps.length}
            </p>
            <CardTitle className="mt-1 text-2xl">{steps[step]}</CardTitle>
          </div>
          <span className="text-muted-foreground text-sm">
            {Math.round(((step + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={form.handleSubmit((input) => generation.mutate(input))}>
          {step === 0 && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="workoutType"
                render={({ field, fieldState }) => (
                  <FormSelect
                    id="workout-type"
                    label="What kind of training sounds right?"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Choose a style"
                    error={fieldState.error?.message}
                    choices={[
                      { value: "strength", label: "Strength and gym machines" },
                      { value: "general fitness", label: "General fitness" },
                      { value: "bodyweight", label: "Bodyweight training" },
                      { value: "mixed", label: "A balanced mix" },
                    ]}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fitnessGoal"
                render={({ field, fieldState }) => (
                  <FormSelect
                    id="fitness-goal"
                    label="What matters most right now?"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Choose your goal"
                    error={fieldState.error?.message}
                    choices={[
                      {
                        value: "build confidence",
                        label: "Feel confident at the gym",
                      },
                      { value: "build muscle", label: "Build muscle" },
                      { value: "lose fat", label: "Lose fat" },
                      {
                        value: "improve health",
                        label: "Improve health and energy",
                      },
                    ]}
                  />
                )}
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="experienceLevel"
                render={({ field, fieldState }) => (
                  <FormSelect
                    id="experience-level"
                    label="Gym experience"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Choose your experience"
                    error={fieldState.error?.message}
                    choices={[
                      { value: "beginner", label: "New or returning" },
                      {
                        value: "intermediate",
                        label: "Comfortable with the basics",
                      },
                      { value: "advanced", label: "Experienced" },
                    ]}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="ageRange"
                render={({ field, fieldState }) => (
                  <FormSelect
                    id="age-range"
                    label="Age range"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Choose an age range"
                    error={fieldState.error?.message}
                    choices={[
                      { value: "18-29", label: "18–29" },
                      { value: "30-44", label: "30–44" },
                      { value: "45-59", label: "45–59" },
                      { value: "60+", label: "60+" },
                    ]}
                  />
                )}
              />
              <div className="space-y-2">
                <Label htmlFor="duration">Minutes per workout</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={90}
                  step={5}
                  className="h-11"
                  {...form.register("preferredDuration", {
                    valueAsNumber: true,
                  })}
                />
                {form.formState.errors.preferredDuration && (
                  <p className="text-destructive text-sm">
                    Choose between 15 and 90 minutes
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="days-per-week">Workouts per week</Label>
                <Input
                  id="days-per-week"
                  type="number"
                  min={2}
                  max={6}
                  className="h-11"
                  {...form.register("daysPerWeek", { valueAsNumber: true })}
                />
                {form.formState.errors.daysPerWeek && (
                  <p className="text-destructive text-sm">Choose 2 to 6 days</p>
                )}
              </div>
              <Controller
                control={form.control}
                name="includeCardio"
                render={({ field }) => (
                  <div className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-2">
                    <Checkbox
                      id="include-cardio"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <div>
                      <Label htmlFor="include-cardio">
                        Include gentle cardio
                      </Label>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Add optional cardio that fits the session length.
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment you can use</Label>
                <Textarea
                  id="equipment"
                  rows={4}
                  placeholder="Example: treadmill, adjustable dumbbells, and the assisted pull-up machine with a knee pad. I can also do bodyweight exercises."
                  aria-invalid={Boolean(form.formState.errors.equipment)}
                  {...form.register("equipment")}
                />
                <p className="text-muted-foreground text-sm">
                  Plain descriptions are fine—you do not need to know machine
                  names.
                </p>
                {form.formState.errors.equipment && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.equipment.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="limitations">
                  Pain, injuries, or movements to avoid
                </Label>
                <Textarea
                  id="limitations"
                  rows={4}
                  placeholder="Example: my right knee gets sore with deep squats. Leave blank if none."
                  {...form.register("limitations")}
                />
                <p className="text-muted-foreground text-sm">
                  FitSpark can suggest gentler options but does not replace
                  medical advice.
                </p>
              </div>
            </div>
          )}

          {generation.isError && (
            <div
              role="alert"
              className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800"
            >
              {generation.error.message}
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
                disabled={generation.isPending}
              >
                {generation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {generation.isPending ? "Building your plan" : "Build my plan"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
