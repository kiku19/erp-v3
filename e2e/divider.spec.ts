import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-divider";

test.describe("Divider Component E2E", () => {
  test("renders horizontal divider by default", async ({ page }) => {
    await page.goto(`${STORY_URL}--horizontal&viewMode=story`);
    const divider = page.getByRole("separator");
    await expect(divider).toBeVisible();
    await expect(divider).toHaveClass(/w-full/);
    await expect(divider).toHaveClass(/bg-border/);
  });

  test("renders vertical divider", async ({ page }) => {
    await page.goto(`${STORY_URL}--vertical&viewMode=story`);
    const divider = page.getByRole("separator");
    await expect(divider).toBeVisible();
    await expect(divider).toHaveClass(/w-px/);
    await expect(divider).toHaveClass(/h-full/);
  });

  test("has correct aria-orientation for vertical", async ({ page }) => {
    await page.goto(`${STORY_URL}--vertical&viewMode=story`);
    const divider = page.getByRole("separator");
    await expect(divider).toHaveAttribute("aria-orientation", "vertical");
  });
});
