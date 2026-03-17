import { test, expect } from "@playwright/test";

const BASE_URL = "/iframe.html?id=planner-progressview";

test.describe("ProgressChart E2E", () => {
  test("renders progress chart with summary cards", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    await expect(page.getByText("Overall")).toBeVisible();
    await expect(page.getByText("Complete")).toBeVisible();
  });

  test("renders overall percent", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    const overallPercent = page.getByTestId("overall-percent");
    await expect(overallPercent).toBeVisible();
  });

  test("renders completion count", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    const completionCount = page.getByTestId("completion-count");
    await expect(completionCount).toBeVisible();
  });

  test("renders S-curve canvas", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    const canvas = page.getByTestId("s-curve-canvas");
    await expect(canvas).toBeVisible();
  });

  test("renders activity status bar", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    const statusBar = page.getByTestId("activity-status-bar");
    await expect(statusBar).toBeVisible();
  });

  test("renders legend items", async ({ page }) => {
    await page.goto(`${BASE_URL}--default&viewMode=story`);
    await expect(page.getByText("Planned")).toBeVisible();
    await expect(page.getByText("Actual")).toBeVisible();
  });

  test("renders with empty data", async ({ page }) => {
    await page.goto(`${BASE_URL}--empty&viewMode=story`);
    const overallPercent = page.getByTestId("overall-percent");
    await expect(overallPercent).toBeVisible();
    await expect(overallPercent).toHaveText(/0%/);
  });

  test("renders all complete state", async ({ page }) => {
    await page.goto(`${BASE_URL}--all-complete&viewMode=story`);
    const overallPercent = page.getByTestId("overall-percent");
    await expect(overallPercent).toBeVisible();
    await expect(overallPercent).toHaveText(/100%/);
  });

  test("renders EVM metrics", async ({ page }) => {
    await page.goto(`${BASE_URL}--with-evm&viewMode=story`);
    const spiValue = page.getByTestId("spi-value");
    const cpiValue = page.getByTestId("cpi-value");
    await expect(spiValue).toBeVisible();
    await expect(cpiValue).toBeVisible();
  });

  test("renders without cost data", async ({ page }) => {
    await page.goto(`${BASE_URL}--no-cost-data&viewMode=story`);
    const spiValue = page.getByTestId("spi-value");
    const cpiValue = page.getByTestId("cpi-value");
    await expect(spiValue).not.toBeVisible();
    await expect(cpiValue).not.toBeVisible();
  });
});
