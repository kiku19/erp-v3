import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-textarea";

test.describe("Textarea Component E2E", () => {
  test("default textarea renders and is interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const textarea = page.getByRole("textbox");
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
    await textarea.fill("Hello world");
    await expect(textarea).toHaveValue("Hello world");
  });

  test("textarea renders with placeholder", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-placeholder&viewMode=story`);
    const textarea = page.getByRole("textbox");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder");
  });

  test("disabled textarea is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const textarea = page.getByRole("textbox");
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeDisabled();
  });

  test("textarea has correct styling classes", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const textarea = page.getByRole("textbox");
    await expect(textarea).toHaveClass(/bg-background/);
    await expect(textarea).toHaveClass(/rounded-md/);
    await expect(textarea).toHaveClass(/border/);
    await expect(textarea).toHaveClass(/min-h-\[100px\]/);
  });
});
