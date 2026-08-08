import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("explains the beginner-first product promise", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/FitSpark/);
    await expect(
      page.getByRole("heading", {
        name: "Walk into the gym knowing exactly what to do next.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Your beginner-friendly gym guide"),
    ).toBeVisible();
  });

  test("offers a clear plan entry point and product explanation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "Create my plan" }),
    ).toHaveAttribute("href", "/sign-up");

    await page.getByRole("link", { name: "See how it works" }).click();
    await expect(
      page.locator("#how-it-works").getByRole("heading", {
        name: "How it works",
      }),
    ).toBeVisible();
  });
});
