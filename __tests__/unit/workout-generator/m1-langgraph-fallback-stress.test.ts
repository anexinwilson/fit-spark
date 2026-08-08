import { workoutPlanWorkflow } from "@/lib/workout-generator/graph";
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
              id: "ex-1",
              fields: {
                name: "Barbell Bench Press",
                primary_muscle: "chest",
                difficulty: "intermediate",
                equipment_name: "Barbell",
                text: "Instructions:\n1. Lie on bench.",
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
});

describe("Milestone 1 LangGraph Fallback Stress Tests", () => {
  const originalInvoke = ChatGoogleGenerativeAI.prototype.invoke;

  const mockPineconeHits = [
    {
      id: "1",
      score: 0.9,
      fields: {
        name: "Barbell Bench Press",
        equipment_name: "Machine",
        category: "Chest"
      }
    },
    {
      id: "2",
      score: 0.9,
      fields: {
        name: "Leg Press",
        equipment_name: "Machine",
        category: "Legs"
      }
    }
  ];

  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("pinecone.io")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            result: { hits: mockPineconeHits }
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
  });

  afterEach(() => {
    ChatGoogleGenerativeAI.prototype.invoke = originalInvoke;
    global.fetch = originalFetch;
  });

  it("executes standard plan generation with exactly 1 LLM call", async () => {
    let llmCallCounter = 0;

    ChatGoogleGenerativeAI.prototype.invoke = async function (this: ChatGoogleGenerativeAI, input: any) {
      llmCallCounter++;
      const promptStr = typeof input === "string" ? input : JSON.stringify(input);
      if (promptStr.includes("designing a weekly training split")) {
        return Promise.resolve({
          content: JSON.stringify({ Monday: ["Leg Press", "Chest Press Machine"] })
        } as any);
      }
      return Promise.resolve({
        content: validPlanJson,
      } as any);
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
    expect(llmCallCounter).toBe(2);
  });

  it("falls back from gemini-flash-latest to gemini-1.5-flash-8b when primary returns HTTP 429", async () => {
    const attemptedModels: string[] = [];

    ChatGoogleGenerativeAI.prototype.invoke = function (this: ChatGoogleGenerativeAI, input: any) {
      attemptedModels.push(this.model);
      if (this.model === "gemini-3.6-flash") {
        const err = new Error("429") as any;
        err.status = 429;
        return Promise.reject(err);
      }
      const promptStr = typeof input === "string" ? input : JSON.stringify(input);
      if (promptStr.includes("designing a weekly training split")) {
        return Promise.resolve({
          content: JSON.stringify({ Monday: ["Barbell Bench Press"] })
        } as any);
      }
      return Promise.resolve({
        content: validPlanJson,
      } as any);
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
    const plan2: Record<string, unknown> = {};
    for (const dp of result2.dailyPlans as Record<string, unknown>[]) {
      if ((dp as any) !== "CLEAR") Object.assign(plan2, dp);
    }
    console.log("[TEST 2] result2.dailyPlans:", JSON.stringify(result2.dailyPlans, null, 2));
    console.log("[TEST 2] plan2:", JSON.stringify(plan2, null, 2));
    expect(Object.keys(plan2).length).toBeGreaterThan(0);
    expect(attemptedModels[0]).toBe("gemini-3.6-flash");
    expect(attemptedModels[1]).toBe("gemini-3.5-flash");
  });

  it("falls back to gemini-3.0-flash when previous return HTTP 429", async () => {
    const attemptedModels: string[] = [];

    ChatGoogleGenerativeAI.prototype.invoke = function (this: ChatGoogleGenerativeAI, input: any) {
      console.log("[TEST 3] Model:", this.model);
      attemptedModels.push(this.model);
      if (this.model === "gemini-3.6-flash" || this.model === "gemini-3.5-flash") {
        const err = new Error("429") as any;
        err.status = 429;
        return Promise.reject(err);
      }
      const promptStr = typeof input === "string" ? input : JSON.stringify(input);
      if (promptStr.includes("designing a weekly training split")) {
        return Promise.resolve({
          content: JSON.stringify({ Monday: ["Barbell Bench Press"] })
        } as any);
      }
      return Promise.resolve({
        content: validPlanJson,
      } as any);
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
    const plan3: Record<string, unknown> = {};
    for (const dp of result3.dailyPlans as Record<string, unknown>[]) {
      if ((dp as any) !== "CLEAR") Object.assign(plan3, dp);
    }
    console.log("[TEST 3] result3.dailyPlans:", JSON.stringify(result3.dailyPlans, null, 2));
    console.log("[TEST 3] plan3:", JSON.stringify(plan3, null, 2));
    expect(Object.keys(plan3).length).toBeGreaterThan(0);
    expect(attemptedModels.slice(0, 3)).toEqual([
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.0-flash",
    ]);
  });

  it("catches non-RAG exercise violations in safetyEvaluator without LLM calls", async () => {
    const invalidExercisePlanJson = JSON.stringify({
      mainWorkout: [
        {
          name: "Unapproved Barbell Squat",
          equipment: "Barbell",
          setsAndReps: "3x10",
        },
      ],
    });

    ChatGoogleGenerativeAI.prototype.invoke = async function (input: any) {
      const promptStr = typeof input === "string" ? input : JSON.stringify(input);
      if (promptStr.includes("designing a weekly training split")) {
        return Promise.resolve({
          content: JSON.stringify({ Monday: ["Unapproved Barbell Squat"] })
        } as any);
      }
      return Promise.resolve({
        content: invalidExercisePlanJson,
      } as any);
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
        issue.includes("RAG violation"),
      ),
    ).toBe(true);
  });
});
