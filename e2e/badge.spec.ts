import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-badge";

test.describe("Badge Component E2E", () => {
  test("renders default badge with primary styling", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const badge = page.locator("#storybook-root span").first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/bg-primary/);
    await expect(badge).toHaveClass(/rounded-full/);
  });

  test("renders all variant badges", async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`);
    const badges = page.locator("#storybook-root span");
    await expect(badges).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(badges.nth(i)).toBeVisible();
    }
  });

  test("renders success badge with token colors", async ({ page }) => {
    await page.goto(`${STORY_URL}--success&viewMode=story`);
    const badge = page.locator("#storybook-root span").first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/bg-success-bg/);
    await expect(badge).toHaveClass(/text-success/);
  });
});
