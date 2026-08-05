import { RateLimitQuotaExhaustedError } from "@/lib/errors";
import { POST } from "@/app/api/generate-plan/route";
import { createRequest } from "./test-utils";

jest.mock("@/features/workout-generator/graph", () => ({
  workoutPlanWorkflow: {
    streamEvents: jest.fn(),
  },
}));

import { workoutPlanWorkflow } from "@/features/workout-generator/graph";

const mockedStreamEvents = jest.mocked(workoutPlanWorkflow.streamEvents);

describe("RateLimitQuotaExhaustedError & Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("RateLimitQuotaExhaustedError class", () => {
    it("should create instance with status 429 and default message", () => {
      const err = new RateLimitQuotaExhaustedError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(RateLimitQuotaExhaustedError);
      expect(err.status).toBe(429);
      expect(err.message).toBe(
        "API Quota Exceeded. You have hit the daily request limit.",
      );
      expect(err.name).toBe("RateLimitQuotaExhaustedError");
    });

    it("should accept custom error message", () => {
      const err = new RateLimitQuotaExhaustedError("429 Rate limit quota exceeded");
      expect(err.status).toBe(429);
      expect(err.message).toBe("429 Rate limit quota exceeded");
    });
  });

  describe("POST /api/generate-plan route stream error handling", () => {
    it("should stream error event payload when RateLimitQuotaExhaustedError is thrown", async () => {
      mockedStreamEvents.mockImplementationOnce(() => {
        throw new RateLimitQuotaExhaustedError("429 Rate limit quota exceeded");
      });

      const req = createRequest("http://localhost:3000/api/generate-plan", "POST", {
        fitnessGoal: "build muscle",
        experienceLevel: "beginner",
        trainingDays: ["Monday", "Wednesday", "Friday"],
        limitations: "None",
        equipment: "dumbbells",
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      let streamData = "";
      if (response.body && typeof (response.body as any).getReader === "function") {
        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamData += typeof value === "string" ? value : decoder.decode(value);
        }
      } else {
        streamData = await response.text();
      }
      expect(streamData).toContain(
        'data: {"error":"429 Rate limit quota exceeded"}\n\n',
      );
    });

    it("should return 400 status when required fields are missing", async () => {
      const req = createRequest("http://localhost:3000/api/generate-plan", "POST", {
        fitnessGoal: "",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe(
        "Missing required fields: fitnessGoal, experienceLevel, or trainingDays",
      );
    });
  });
});
