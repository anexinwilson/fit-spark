import { expect, test } from "@playwright/test";

const FORBIDDEN_TERMS = ["AI", "Smart", "Intelligent", "Powered by AI"];
const FORBIDDEN_EMOJIS = ["✨", "🤖"];

test.describe("Workout Plan Streaming UI & LangGraph Workflow", () => {
  test.beforeEach(async ({ context }) => {
    // Inject test authentication cookie so /workoutplan renders the form
    await context.addCookies([
      {
        name: "e2e_test_user",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("1. loads workout generator page (/workoutplan) for authenticated user", async ({
    page,
  }) => {
    await page.goto("/workoutplan");

    await expect(page).toHaveURL(/\/workoutplan$/);
    await expect(
      page.getByRole("heading", {
        name: "Let’s make your next gym visit clear.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByText("Your goal")).toBeVisible();
  });

  test("2. displays redesigned loading view and 4-node LangGraph execution stepper upon form submission", async ({
    page,
  }) => {
    // Intercept SSE streaming API route
    await page.route("**/api/generate-plan", async (route) => {
      const sseBody = [
        `data: ${JSON.stringify({ status: "Resolving equipment...", node: "equipmentResolver" })}\n\n`,
        `data: ${JSON.stringify({ status: "Searching exercise catalog...", node: "exerciseRetriever" })}\n\n`,
        `data: ${JSON.stringify({ chunk: "Day 1: Upper Body Strength\n" })}\n\n`,
        `data: ${JSON.stringify({ status: "Building weekly schedule...", node: "planBuilder" })}\n\n`,
        `data: ${JSON.stringify({ chunk: "1. Dumbbell Chest Press - 3 sets x 10 reps\n" })}\n\n`,
        `data: ${JSON.stringify({ status: "Evaluating safety & compliance...", node: "safetyEvaluator" })}\n\n`,
        `data: ${JSON.stringify({ chunk: "2. Lat Pulldown - 3 sets x 12 reps\n" })}\n\n`,
        `data: ${JSON.stringify({
          complete: true,
          workoutPlan: {
            title: "Beginner Strength Routine",
            overview: "A safe, structured 3-day weekly workout plan.",
            days: [
              {
                dayNumber: 1,
                title: "Day 1 - Upper Body Focus",
                focus: "Chest and Back",
                exercises: [
                  {
                    name: "Dumbbell Chest Press",
                    sets: 3,
                    reps: "10",
                    equipment: "Dumbbells",
                    notes: "Keep shoulders back and maintain core stability.",
                  },
                ],
              },
            ],
          },
        })}\n\n`,
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    });

    await page.goto("/workoutplan");

    // Step 1: Select goal
    await page.getByText("Build confidence").click();
    await page.getByRole("button", { name: /Next step/i }).click();

    // Step 2: Select experience
    await page.getByText("I am new").click();
    await page.getByRole("button", { name: /Next step/i }).click();

    // Step 3: Equipment & safety step
    await expect(page.getByText("Equipment & safety")).toBeVisible();
    const generateBtn = page.getByRole("button", {
      name: "Generate Workout Plan",
    });
    await expect(generateBtn).toBeVisible();

    // Submit form to trigger streaming loading view
    await generateBtn.click();

    // Verify LangGraph Node Execution Stepper nodes
    await expect(page.getByText("Execution Pipeline Stepper")).toBeVisible();
    await expect(page.getByText("Equipment Resolver")).toBeVisible();
    await expect(page.getByText("Exercise Catalog Search")).toBeVisible();
    await expect(page.getByText("Plan Builder")).toBeVisible();
    await expect(page.getByText("Safety & Compliance Evaluator")).toBeVisible();
  });

  test("3. renders real-time token stream terminal box with live token output", async ({
    page,
  }) => {
    // Intercept SSE streaming API with delayed chunks
    await page.route("**/api/generate-plan", async (route) => {
      const sseBody = [
        `data: ${JSON.stringify({ status: "Building weekly schedule...", node: "planBuilder" })}\n\n`,
        `data: ${JSON.stringify({ chunk: '{\n  "title": "3-Day Beginner Plan",\n' })}\n\n`,
        `data: ${JSON.stringify({ chunk: '  "overview": "Focus on proper form and consistency."\n}' })}\n\n`,
        `data: ${JSON.stringify({
          complete: true,
          workoutPlan: {
            title: "3-Day Beginner Plan",
            overview: "Focus on proper form and consistency.",
            days: [],
          },
        })}\n\n`,
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    });

    await page.goto("/workoutplan");

    // Navigate to step 3 and generate
    await page.getByText("Build confidence").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByText("I am new").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: "Generate Workout Plan" }).click();

    // Verify Terminal UI Box elements
    await expect(page.getByText("Live Token Stream Terminal")).toBeVisible();
    await expect(page.getByText("workout-generator --stream")).toBeVisible();
    await expect(page.getByText("STREAMING")).toBeVisible();
  });

  test("4. handles rate limit HTTP 429 quota exhaustion with Error Card transition and Retry action", async ({
    page,
  }) => {
    let callCount = 0;

    // Route interceptor: fails first time with HTTP 429 quota error, succeeds second time
    await page.route("**/api/generate-plan", async (route) => {
      callCount++;
      if (callCount === 1) {
        const errorSse = `data: ${JSON.stringify({ error: "API Quota Exceeded. You have hit the daily request limit." })}\n\n`;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: errorSse,
        });
      } else {
        const successSse = `data: ${JSON.stringify({
          complete: true,
          workoutPlan: {
            title: "Retry Success Plan",
            overview: "Generated successfully after retry.",
            days: [],
          },
        })}\n\n`;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: successSse,
        });
      }
    });

    await page.goto("/workoutplan");

    // Navigate to step 3 and generate
    await page.getByText("Build confidence").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByText("I am new").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: "Generate Workout Plan" }).click();

    // Verify transition to Error Card UI (no hanging spinners)
    await expect(page.getByText("Generation Failed")).toBeVisible();
    await expect(page.getByText("HTTP 429 Quota")).toBeVisible();
    await expect(
      page.getByText(
        "API Quota Exceeded. You have hit the daily request limit.",
      ),
    ).toBeVisible();

    // Verify "Retry Generation" action button is visible
    const retryBtn = page
      .getByRole("button", { name: "Retry Generation" })
      .first();
    await expect(retryBtn).toBeVisible();

    // Click retry and verify error resolves to completed plan state
    await retryBtn.click();
    await expect(page.getByText("Retry Success Plan")).toBeVisible();
  });

  test("5. enforces zero AI branding compliance across workoutplan page states", async ({
    page,
  }) => {
    await page.goto("/workoutplan");
    await page.waitForLoadState("domcontentloaded");

    const bodyText = await page.innerText("body");

    // Check forbidden terms
    for (const word of FORBIDDEN_TERMS) {
      if (word === "AI") {
        expect(bodyText).not.toMatch(/\bAI\b/);
      } else {
        expect(bodyText).not.toMatch(new RegExp(word, "i"));
      }
    }

    // Check forbidden emojis
    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(bodyText).not.toContain(emoji);
    }

    // Check forbidden SVG icon
    const sparklesIcon = page.locator(
      "svg.lucide-sparkles, svg[data-icon='sparkles']",
    );
    await expect(sparklesIcon).toHaveCount(0);
  });
});
