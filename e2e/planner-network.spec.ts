import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=planner-networkview";

test.describe("NetworkChart E2E", () => {
  test("renders network chart container", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const chart = page.getByTestId("network-chart");
    await expect(chart).toBeVisible();
  });

  test("renders canvas element", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const canvas = page.getByTestId("network-canvas");
    await expect(canvas).toBeVisible();
  });

  test("renders fit button", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const fitBtn = page.getByTestId("network-fit-btn");
    await expect(fitBtn).toBeVisible();
    await expect(fitBtn).toBeEnabled();
  });

  test("renders with selection", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-selection&viewMode=story`);
    const chart = page.getByTestId("network-chart");
    await expect(chart).toBeVisible();
    const canvas = page.getByTestId("network-canvas");
    await expect(canvas).toBeVisible();
  });

  test("renders empty state", async ({ page }) => {
    await page.goto(`${STORY_URL}--empty&viewMode=story`);
    const chart = page.getByTestId("network-chart");
    await expect(chart).toBeVisible();
    const canvas = page.getByTestId("network-canvas");
    await expect(canvas).toBeVisible();
  });

  test("fit button is clickable", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const fitBtn = page.getByTestId("network-fit-btn");
    await expect(fitBtn).toBeVisible();

    // Click should not throw any errors
    await fitBtn.click();

    // Chart should still be visible after clicking fit
    const chart = page.getByTestId("network-chart");
    await expect(chart).toBeVisible();
  });
});
