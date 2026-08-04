import { expect, test } from "@playwright/test";

test.describe("public route health", () => {
  for (const route of [
    "/",
    "/sign-up",
    "/sign-in",
    "/subscribe",
    "/create-profile",
    "/profile",
    "/auth/continue",
  ]) {
    test(`${route} renders successfully`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    });
  }

  test("protected workout plan redirects signed-out visitors", async ({
    page,
  }) => {
    await page.goto("/workoutplan");

    await expect(page).toHaveURL(/\/sign-up$/);
  });
});
