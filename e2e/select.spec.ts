import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-select";

test.describe("Select Component E2E", () => {
  test("default select renders with placeholder", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button");
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("Select an option");
  });

  test("select opens dropdown and allows selection", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button");
    await trigger.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    const option = page.getByRole("option", { name: "Banana" });
    await option.click();
    await expect(trigger).toContainText("Banana");
    await expect(listbox).not.toBeVisible();
  });

  test("disabled select is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const trigger = page.getByRole("button");
    await expect(trigger).toBeDisabled();
  });

  test("select closes on Escape key", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button");
    await trigger.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(listbox).not.toBeVisible();
  });

  test("preselected value displays correctly", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-default-value&viewMode=story`);
    const trigger = page.getByRole("button");
    await expect(trigger).toContainText("Banana");
  });
});
