import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-typeahead";

test.describe("Typeahead Component E2E", () => {
  test("renders search input and all items", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByPlaceholder("Search...");
    await expect(input).toBeVisible();
    const items = page.getByRole("option");
    await expect(items).toHaveCount(4);
  });

  test("filters items as user types", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByPlaceholder("Search...");
    await input.fill("Doc");
    const items = page.getByRole("option");
    await expect(items).toHaveCount(2);
  });

  test("navigates with arrow keys", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByPlaceholder("Search...");
    await input.click();
    await page.keyboard.press("ArrowDown");
    const firstItem = page.getByRole("option").first();
    await expect(firstItem).toHaveClass(/bg-accent/);
    await page.keyboard.press("ArrowDown");
    const secondItem = page.getByRole("option").nth(1);
    await expect(secondItem).toHaveClass(/bg-accent/);
  });

  test("clears input with Escape", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByPlaceholder("Search...");
    await input.fill("Doc");
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
  });

  test("shows no results for unmatched query", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByPlaceholder("Search...");
    await input.fill("zzzzz");
    const items = page.getByRole("option");
    await expect(items).toHaveCount(0);
  });

  test("displays item descriptions", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    await expect(page.getByText("View all documents")).toBeVisible();
    await expect(page.getByText("Manage projects")).toBeVisible();
  });
});
