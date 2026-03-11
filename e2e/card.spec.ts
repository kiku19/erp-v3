import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-card";

test.describe("Card Component E2E", () => {
  test("renders a default card with border and background", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const card = page.locator("[data-testid='card']");
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/bg-card/);
    await expect(card).toHaveClass(/rounded-lg/);
    await expect(card).toHaveClass(/border/);
  });

  test("renders a composed card with all sub-components", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-all-sections&viewMode=story`);
    const card = page.locator("[data-testid='card']");
    await expect(card).toBeVisible();
    await expect(page.getByText("Card Title")).toBeVisible();
    await expect(page.getByText("Card description text")).toBeVisible();
  });

  test("renders card with actions", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-actions&viewMode=story`);
    const actions = page.locator("[data-testid='card']").last();
    await expect(actions).toBeVisible();
    const buttons = page.getByRole("button");
    await expect(buttons).toHaveCount(2);
  });
});
