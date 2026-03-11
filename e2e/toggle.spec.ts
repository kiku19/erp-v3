import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-toggle";

test.describe("Toggle Component E2E", () => {
  test("off toggle renders correctly", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const toggle = page.getByRole("switch");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("toggle switches on click", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const toggle = page.getByRole("switch");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("on toggle renders in on state", async ({ page }) => {
    await page.goto(`${STORY_URL}--checked&viewMode=story`);
    const toggle = page.getByRole("switch");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(toggle).toHaveClass(/bg-primary/);
  });

  test("disabled toggle is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const toggle = page.getByRole("switch");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await toggle.click({ force: true });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("toggle switches with keyboard", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const toggle = page.getByRole("switch");
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  test("toggle with label renders label text", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-label&viewMode=story`);
    const label = page.getByText("Enable notifications");
    await expect(label).toBeVisible();
  });
});
