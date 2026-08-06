import { workoutPlanWorkflow } from "../src/features/workout-generator/graph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createRequest, readResponse } from "./test-utils";

// Mock Pinecone API fetch to return a mix of machine, dumbbell, and bodyweight exercises
const mockPineconeHits = [
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
      name: "Pushups",
      equipment_name: "Bodyweight",
      category: "Chest",
    },
  },
  {
    fields: {
      name: "Bodyweight Squats",
      equipment_name: "Bodyweight",
      category: "Legs",
    },
  },
];

const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes("records/namespaces")) {
      return {
        ok: true,
        text: async () =>
          JSON.stringify({ result: { hits: mockPineconeHits } }),
        json: async () => ({ result: { hits: mockPineconeHits } }),
      } as Response;
    }
    if (originalFetch) {
      return originalFetch(url, init);
    }
    return {
      ok: true,
      text: async () => "",
      json: async () => ({}),
    } as Response;
  };
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("Equipment Enforcement & Programmatic Evals", () => {
  const originalInvoke = ChatGoogleGenerativeAI.prototype.invoke;

  afterEach(() => {
    ChatGoogleGenerativeAI.prototype.invoke = originalInvoke;
  });

  describe("API Route Validation", () => {
    it("returns 400 validation error when equipment is empty string", async () => {
      const { POST } = await import("@/app/api/generate-plan/route");
      const req = createRequest("http://localhost/api/generate-plan", "POST", {
        fitnessGoal: "Build Muscle",
        experienceLevel: "Beginner",
        trainingDays: ["Monday", "Wednesday"],
        equipment: "",
      });

      const res = await POST(req);
      const { status, body } = await readResponse(res);
      const bodyObj = body as { error?: string };

      expect(status).toBe(400);
      expect(bodyObj).toHaveProperty("error");
      expect(bodyObj.error).toContain("Equipment selection cannot be empty");
    });

    it("returns 400 validation error when equipment is empty array", async () => {
      const { POST } = await import("@/app/api/generate-plan/route");
      const req = createRequest("http://localhost/api/generate-plan", "POST", {
        fitnessGoal: "Build Muscle",
        experienceLevel: "Beginner",
        trainingDays: ["Monday", "Wednesday"],
        equipment: [],
      });

      const res = await POST(req);
      const { status, body } = await readResponse(res);
      const bodyObj = body as { error?: string };

      expect(status).toBe(400);
      expect(bodyObj).toHaveProperty("error");
      expect(bodyObj.error).toContain("Equipment selection cannot be empty");
    });
  });

  describe("LangGraph Equipment Enforcement", () => {
    it("strictly filters RAG database to non-bodyweight exercises when only 'Machine' is requested", async () => {
      const validMachinePlanJson = JSON.stringify({
        Monday: {
          warmup: [],
          mainWorkout: [
            {
              name: "Leg Press",
              equipment: "Machine",
              setsAndReps: "3x10",
              notes: "Focus on machine leg press",
            },
            {
              name: "Chest Press Machine",
              equipment: "Machine",
              setsAndReps: "3x12",
              notes: "Maintain tension",
            },
          ],
          cooldown: [],
          cardio: [],
        },
      });

      ChatGoogleGenerativeAI.prototype.invoke = async function () {
        return Promise.resolve({
          content: validMachinePlanJson,
        } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
      };

      const result = await workoutPlanWorkflow.invoke({
        goal: "Build Muscle",
        experience: "Beginner",
        daysPerWeek: 1,
        trainingDays: ["Monday"],
        injuries: "None",
        equipment: ["Machine"],
      });

      // Verify retrieved exercises contain ONLY Machine exercises, NO Bodyweight exercises
      expect(result.exercises).toBeDefined();
      expect(result.exercises.length).toBeGreaterThan(0);
      const bodyweightRetrieved = result.exercises.filter(
        (ex: string) =>
          ex.toLowerCase().includes("bodyweight") ||
          ex.toLowerCase().includes("pushups"),
      );
      expect(bodyweightRetrieved).toHaveLength(0);

      // Parse plan and verify zero bodyweight exercises in mainWorkout
      const parsedPlan = JSON.parse(result.plan as string);
      const mondayMain = parsedPlan.Monday.mainWorkout;

      const bodyweightInMain = mondayMain.filter(
        (ex: { name: string; equipment: string }) =>
          ex.equipment.toLowerCase() === "bodyweight" ||
          ex.name.toLowerCase().includes("pushup") ||
          (ex.name.toLowerCase().includes("squat") &&
            !ex.name.toLowerCase().includes("press")),
      );
      expect(bodyweightInMain).toHaveLength(0);
      expect(result.safetyIssues).toHaveLength(0);
    });

    it("detects equipment constraint violation in safetyEvaluator if LLM includes bodyweight in mainWorkout", async () => {
      const invalidBodyweightInMainPlanJson = JSON.stringify({
        Monday: {
          mainWorkout: [
            {
              name: "Pushups",
              equipment: "Bodyweight",
              setsAndReps: "3x15",
            },
          ],
        },
      });

      ChatGoogleGenerativeAI.prototype.invoke = async function () {
        return Promise.resolve({
          content: invalidBodyweightInMainPlanJson,
        } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
      };

      const result = await workoutPlanWorkflow.invoke({
        goal: "Build Muscle",
        experience: "Beginner",
        daysPerWeek: 1,
        trainingDays: ["Monday"],
        injuries: "None",
        equipment: ["Machine"],
      });

      expect(result.safetyIssues).toBeDefined();
      expect(
        result.safetyIssues.some((issue: string) =>
          issue.includes("Violates Equipment Constraints"),
        ),
      ).toBe(true);
    });

    it("resolves empty equipment without defaulting to bodyweight in equipmentResolver", async () => {
      ChatGoogleGenerativeAI.prototype.invoke = async function () {
        return Promise.resolve({
          content: JSON.stringify({ Monday: { mainWorkout: [] } }),
        } as unknown as Awaited<ReturnType<typeof originalInvoke>>);
      };

      const result = await workoutPlanWorkflow.invoke({
        goal: "General Fitness",
        experience: "Beginner",
        daysPerWeek: 1,
        trainingDays: ["Monday"],
        injuries: "None",
        equipment: [],
      });

      expect(result.equipment).toEqual([]);
      expect(result.exercises).toEqual([]);
    });
  });
});
