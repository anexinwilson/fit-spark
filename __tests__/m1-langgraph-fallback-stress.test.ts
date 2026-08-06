import { workoutPlanWorkflow } from "../src/features/workout-generator/graph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Mock Pinecone fetch globally
const mockPineconeFetch = async () =>
  Promise.resolve({
    ok: true,
    text: async () => Promise.resolve(""),
    json: async () =>
      Promise.resolve({
        result: {
          hits: [
            {
              fields: {
                name: "Leg Press",
                equipment_name: "Machine",
                category: "Legs",
              },
            },
            {
              fields: {
                name: "Chest Press Machine",
                equipment_name: "Machine",
                category: "Chest",
              },
            },
            {
              fields: {
                name: "Lat Pulldown",
                equipment_name: "Machine",
                category: "Back",
              },
            },
          ],
        },
      }),
  });

global.fetch = mockPineconeFetch as unknown as typeof fetch;

const validPlanJson = JSON.stringify({
  Monday: {
    warmup: [],
    mainWorkout: [
      {
        name: "Leg Press",
        equipment: "Machine",
        setsAndReps: "3x10",
        notes: "Focus on form",
      },
    ],
    cooldown: [],
    cardio: [],
  },
});

describe("Milestone 1 LangGraph Fallback Stress Tests", () => {
  const originalInvoke = ChatGoogleGenerativeAI.prototype.invoke;

  afterEach(() => {
    ChatGoogleGenerativeAI.prototype.invoke = originalInvoke;
  });

  it("executes standard plan generation with exactly 1 LLM call", async () => {
    let llmCallCounter = 0;

    ChatGoogleGenerativeAI.prototype.invoke = async function (
      this: ChatGoogleGenerativeAI,
    ) {
      llmCallCounter++;
      return Promise.resolve({
        content: validPlanJson,
      } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
    };

    const initialState = {
      goal: "muscle-gain",
      experience: "beginner",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
      injuries: "None",
      equipment: ["Machine"],
    };

    const result1 = await workoutPlanWorkflow.invoke(initialState);
    expect(result1.safetyIssues).toHaveLength(0);
    expect(llmCallCounter).toBe(1);
  });

  it("falls back from gemini-flash-latest to gemini-1.5-flash-8b when primary returns HTTP 429", async () => {
    const attemptedModels: string[] = [];

    ChatGoogleGenerativeAI.prototype.invoke = function (
      this: ChatGoogleGenerativeAI,
    ) {
      attemptedModels.push(this.model);
      if (this.model === "gemini-flash-latest") {
        const err = new Error(
          "429 Too Many Requests - Quota Exceeded",
        ) as Error & {
          status: number;
        };
        err.status = 429;
        return Promise.reject(err);
      }
      return Promise.resolve({
        content: validPlanJson,
      } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
    };

    const initialState = {
      goal: "muscle-gain",
      experience: "beginner",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
      injuries: "None",
      equipment: ["Machine"],
    };

    const result2 = await workoutPlanWorkflow.invoke(initialState);
    expect(Boolean(result2.plan)).toBe(true);
    expect(attemptedModels[0]).toBe("gemini-flash-latest");
    expect(attemptedModels[1]).toBe("gemini-1.5-flash-8b");
  });

  it("falls back to gemini-1.5-pro when gemini-flash-latest and gemini-1.5-flash-8b return HTTP 429", async () => {
    const attemptedModels: string[] = [];

    ChatGoogleGenerativeAI.prototype.invoke = function (
      this: ChatGoogleGenerativeAI,
    ) {
      attemptedModels.push(this.model);
      if (
        this.model === "gemini-flash-latest" ||
        this.model === "gemini-1.5-flash-8b"
      ) {
        const err = new Error(
          "429 Too Many Requests - Quota Exceeded",
        ) as Error & {
          status: number;
        };
        err.status = 429;
        return Promise.reject(err);
      }
      return Promise.resolve({
        content: validPlanJson,
      } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
    };

    const initialState = {
      goal: "muscle-gain",
      experience: "beginner",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
      injuries: "None",
      equipment: ["Machine"],
    };

    const result3 = await workoutPlanWorkflow.invoke(initialState);
    expect(Boolean(result3.plan)).toBe(true);
    expect(attemptedModels).toEqual([
      "gemini-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
    ]);
  });

  it("catches non-RAG exercise violations in safetyEvaluator without LLM calls", async () => {
    const invalidExercisePlanJson = JSON.stringify({
      Monday: {
        mainWorkout: [
          {
            name: "Unapproved Barbell Squat",
            equipment: "Barbell",
            setsAndReps: "3x10",
          },
        ],
      },
    });

    ChatGoogleGenerativeAI.prototype.invoke = async function () {
      return Promise.resolve({
        content: invalidExercisePlanJson,
      } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
    };

    const initialState = {
      goal: "muscle-gain",
      experience: "beginner",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
      injuries: "None",
      equipment: ["Machine"],
    };

    const result4 = await workoutPlanWorkflow.invoke(initialState);
    expect(
      result4.safetyIssues.some((issue: string) =>
        issue.includes("Violates RAG"),
      ),
    ).toBe(true);
  });
});
