import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-input";

test.describe("Input Component E2E", () => {
  test("default input renders and is interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await input.fill("Hello world");
    await expect(input).toHaveValue("Hello world");
  });

  test("input renders with placeholder", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-placeholder&viewMode=story`);
    const input = page.getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder");
  });

  test("disabled input is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const input = page.getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).toBeDisabled();
  });

  test("input has correct styling classes", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const input = page.getByRole("textbox");
    await expect(input).toHaveClass(/bg-background/);
    await expect(input).toHaveClass(/rounded-md/);
    await expect(input).toHaveClass(/border/);
  });

  test("email input accepts email type", async ({ page }) => {
    await page.goto(`${STORY_URL}--email&viewMode=story`);
    const input = page.locator('input[type="email"]');
    await expect(input).toBeVisible();
    await input.fill("test@example.com");
    await expect(input).toHaveValue("test@example.com");
  });
});
