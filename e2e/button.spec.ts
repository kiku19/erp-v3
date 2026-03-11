import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-button";

test.describe("Button Component E2E", () => {
  test("primary button renders and is clickable", async ({ page }) => {
    await page.goto(`${STORY_URL}--primary&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveClass(/bg-primary/);
    await button.click();
  });

  test("secondary button renders with correct variant class", async ({
    page,
  }) => {
    await page.goto(`${STORY_URL}--secondary&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/bg-secondary/);
  });

  test("outline button renders with border class", async ({ page }) => {
    await page.goto(`${STORY_URL}--outline&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/border/);
    await expect(button).toHaveClass(/bg-background/);
  });

  test("ghost button has no background class", async ({ page }) => {
    await page.goto(`${STORY_URL}--ghost&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    // Ghost should NOT have bg-primary or bg-secondary
    const classes = await button.getAttribute("class");
    expect(classes).not.toContain("bg-primary");
    expect(classes).not.toContain("bg-secondary");
    expect(classes).toContain("text-foreground");
  });

  test("destructive button renders with destructive class", async ({
    page,
  }) => {
    await page.goto(`${STORY_URL}--destructive&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/bg-destructive/);
  });

  test("icon button renders as square", async ({ page }) => {
    await page.goto(`${STORY_URL}--icon-button&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/p-2/);
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(4);
  });

  test("disabled button is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const button = page.getByRole("button");
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test("all variants render together", async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`);
    const buttons = page.getByRole("button");
    await expect(buttons).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(buttons.nth(i)).toBeVisible();
    }
  });
});
