import { createRequest, readResponse } from "./test-utils";

jest.mock("@/lib/ai/gemini", () => ({
  generateGeminiJson: jest.fn(),
  GeminiApiError: class GeminiApiError extends Error {
    status?: number;
  },
}));
jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn().mockResolvedValue("u1"),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: jest.fn().mockResolvedValue({ subscriptionActive: true }),
    },
    workoutPlan: {
      upsert: jest.fn(),
    },
  },
}));
import { generateGeminiJson } from "@/lib/ai/gemini";
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const mockedGenerateGeminiJson = jest.mocked(generateGeminiJson);
const mockedGetAuthenticatedUserId = jest.mocked(getAuthenticatedUserId);

const payload = {
  workoutType: "gym",
  fitnessGoal: "muscle-gain",
  experienceLevel: "beginner",
  preferredDuration: 30,
  includeCardio: false,
  days: 7,
  ageRange: "18-25",
  equipment: "dumbbells",
  limitations: "",
  daysPerWeek: 4,
  trainingDays: ["Monday", "Wednesday", "Friday"],
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
  mockedGetAuthenticatedUserId.mockResolvedValue("u1");
  (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
    subscriptionActive: true,
  });
});

describe("generate-workoutplan route", () => {
  it("500 on invalid JSON", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedGenerateGeminiJson.mockResolvedValueOnce("oops");

    const { POST } = await import("@/app/api/generate-workoutplan/route");
    const res = await POST(
      createRequest("http://test.local/ai", "POST", payload),
    );
    expect((await readResponse(res)).status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });

  it("parses valid JSON when Gemini returns it", async () => {
    const expectedPlan = { Monday: { warmup: "run" } };
    mockedGenerateGeminiJson.mockResolvedValueOnce(
      JSON.stringify(expectedPlan),
    );

    const { POST } = await import("@/app/api/generate-workoutplan/route");
    const res = await POST(
      createRequest("http://test.local/ai", "POST", payload),
    );
    const { body } = await readResponse(res);

    expect(body).toMatchObject({ workoutPlan: expectedPlan });
  });
});
