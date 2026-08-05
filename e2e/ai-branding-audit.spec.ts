import { expect, test } from "@playwright/test";

const FORBIDDEN_WORDS = ["AI", "Smart", "Intelligent"];
const FORBIDDEN_EMOJIS = ["✨", "🤖"];

test.describe("AI Branding Compliance Audit", () => {
  const routesToAudit = [
    "/",
    "/equipment",
    "/subscribe",
    "/sign-in",
    "/sign-up",
    "/create-profile",
    "/profile",
  ];

  for (const route of routesToAudit) {
    test(`route ${route} has zero AI branding, forbidden words, or sparkle icons`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const bodyText = await page.innerText("body");

      // Check forbidden terms
      for (const word of FORBIDDEN_WORDS) {
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

      // Check for Lucide Sparkles icon or any SVG with class/data attribute containing sparkles
      const sparklesIcon = page.locator(
        "svg.lucide-sparkles, svg[data-icon='sparkles']",
      );
      await expect(sparklesIcon).toHaveCount(0);
    });
  }

  test("/workoutplan route and redirected page have zero AI branding", async ({
    page,
  }) => {
    const response = await page.goto("/workoutplan");
    expect(response?.status()).toBe(200);

    const bodyText = await page.innerText("body");

    for (const word of FORBIDDEN_WORDS) {
      if (word === "AI") {
        expect(bodyText).not.toMatch(/\bAI\b/);
      } else {
        expect(bodyText).not.toMatch(new RegExp(word, "i"));
      }
    }

    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(bodyText).not.toContain(emoji);
    }

    const sparklesIcon = page.locator(
      "svg.lucide-sparkles, svg[data-icon='sparkles']",
    );
    await expect(sparklesIcon).toHaveCount(0);
  });
});
