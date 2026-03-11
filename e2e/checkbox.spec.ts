import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-checkbox";

test.describe("Checkbox Component E2E", () => {
  test("unchecked checkbox renders correctly", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test("checkbox toggles on click", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const checkbox = page.getByRole("checkbox");
    // Click the label wrapper since the sr-only input is covered by the visual span
    await checkbox.click({ force: true });
    await expect(checkbox).toBeChecked();
    await checkbox.click({ force: true });
    await expect(checkbox).not.toBeChecked();
  });

  test("checked checkbox renders with check icon", async ({ page }) => {
    await page.goto(`${STORY_URL}--checked&viewMode=story`);
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked();
  });

  test("disabled checkbox is not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`);
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeDisabled();
  });

  test("checkbox toggles with keyboard", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const checkbox = page.getByRole("checkbox");
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
  });

  test("checkbox with label renders label text", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-label&viewMode=story`);
    const label = page.getByText("Accept terms and conditions");
    await expect(label).toBeVisible();
  });

  test("clicking the label toggles checkbox", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-label&viewMode=story`);
    const label = page.getByText("Accept terms and conditions");
    const checkbox = page.getByRole("checkbox");
    await label.click();
    await expect(checkbox).toBeChecked();
  });
});
