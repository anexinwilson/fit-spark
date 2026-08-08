import { expect, test } from "@playwright/test";

test.describe("Equipment Search & Catalog UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/equipment");
    await expect(
      page.getByRole("heading", { name: "Equipment Search & Catalog" }),
    ).toBeVisible();
  });

  test("executes equipment search query and renders matching equipment cards", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder(
      "Search by equipment name, muscle, or exercise type...",
    );
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Lat Pulldown");
    await expect(page.getByText("Lat Pulldown").first()).toBeVisible();
    await expect(page.getByText("Seated Leg Press")).not.toBeVisible();
  });

  test("renders Pinecone RAG retrieval response source badge and result count", async ({
    page,
  }) => {
    const countBadge = page
      .locator("div")
      .filter({ hasText: /Equipment Found/i })
      .first();
    await expect(countBadge).toBeVisible();

    const sourceBadge = page
      .locator("div")
      .filter({ hasText: /Source:/i })
      .first();
    await expect(sourceBadge).toBeVisible();
  });

  test("renders equipment cards with badges and details button", async ({
    page,
  }) => {
    const cards = page.locator("div.grid > div");
    await expect(cards.first()).toBeVisible();

    const firstCard = cards.first();
    await expect(
      firstCard.getByRole("button", { name: /View Details/i }),
    ).toBeVisible();
  });

  test("filters equipment by muscle group", async ({ page }) => {
    const muscleSelect = page.getByLabel("Filter by muscle group");
    await muscleSelect.selectOption("quadriceps");

    await expect(page.getByText("Seated Leg Press").first()).toBeVisible();
    await expect(page.getByText("Seated Chest Press")).not.toBeVisible();
  });

  test("filters equipment by category", async ({ page }) => {
    const categorySelect = page.getByLabel("Filter by category");
    await categorySelect.selectOption("Chest");

    await expect(page.getByText("Seated Chest Press").first()).toBeVisible();
    await expect(page.getByText("Lat Pulldown")).not.toBeVisible();
  });

  test("filters equipment by difficulty level", async ({ page }) => {
    const levelSelect = page.getByLabel("Filter by difficulty level");
    await levelSelect.selectOption("intermediate");

    await expect(page.getByText("Cable Chest Fly").first()).toBeVisible();
  });

  test("displays empty state on non-matching search and resets all filters", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder(
      "Search by equipment name, muscle, or exercise type...",
    );
    await searchInput.fill("xyznonexistentmachine123");

    await expect(
      page.getByText("No equipment matches your search"),
    ).toBeVisible();

    const resetButton = page.getByRole("button", {
      name: "Reset All Filters",
    });
    await expect(resetButton).toBeVisible();

    await resetButton.click();

    await expect(searchInput).toHaveValue("");
    await expect(
      page.getByText("No equipment matches your search"),
    ).not.toBeVisible();
    await expect(page.getByText("Lat Pulldown").first()).toBeVisible();
  });

  test("reports an image loading error instead of hiding it", async ({
    page,
  }) => {
    await page.route("**/*.jpg*", (route) => route.abort());
    await page.route("**/*.webp*", (route) => route.abort());
    await page.route("**/*.png*", (route) => route.abort());

    await page.reload();

    await expect(
      page.getByText("Equipment image failed to load.").first(),
    ).toBeVisible();
  });
});

test.describe("Equipment Detail Modal Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/equipment");
  });

  test("opens equipment detail modal dialog and displays exercise information", async ({
    page,
  }) => {
    const viewDetailsBtn = page
      .getByRole("button", { name: /View Details/i })
      .first();
    await viewDetailsBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });

  test("renders muscle tags and step-by-step execution instructions in modal", async ({
    page,
  }) => {
    const viewDetailsBtn = page
      .getByRole("button", { name: /View Details/i })
      .first();
    await viewDetailsBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("Primary Muscle Groups")).toBeVisible();
    await expect(dialog.getByText("Execution Instructions")).toBeVisible();

    const instructionListItems = dialog.locator("ol > li");
    await expect(instructionListItems.first()).toBeVisible();
  });

  test("closes equipment detail modal dialog via Close button and Escape key", async ({
    page,
  }) => {
    const viewDetailsBtn = page
      .getByRole("button", { name: /View Details/i })
      .first();
    await viewDetailsBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const closeBtn = dialog.getByRole("button", { name: "Close" }).last();
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();

    await viewDetailsBtn.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Navigation Link Integration", () => {
  test("navbar Equipment Catalog link navigates to /equipment page", async ({
    page,
  }) => {
    await page.goto("/");

    const navLink = page
      .locator("header nav")
      .getByRole("link", { name: /Equipment Catalog/i })
      .first();
    await expect(navLink).toBeVisible();
    await navLink.click();

    await expect(page).toHaveURL(/\/equipment$/);
    await expect(
      page.getByRole("heading", { name: "Equipment Search & Catalog" }),
    ).toBeVisible();
  });
});
