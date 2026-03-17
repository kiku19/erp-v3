import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=planner-resourceview";

test.describe("Resource Chart E2E", () => {
  test("renders resource chart", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const chart = page.getByTestId("resource-chart");
    await expect(chart).toBeVisible();
  });

  test("renders empty state", async ({ page }) => {
    await page.goto(`${STORY_URL}--empty&viewMode=story`);
    await expect(page.getByText("No resources yet")).toBeVisible();
  });

  test("renders resource sidebar", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const sidebar = page.getByTestId("resource-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(page.getByText("Crane")).toBeVisible();
    await expect(page.getByText("Electrician")).toBeVisible();
    await expect(page.getByText("Concrete")).toBeVisible();
  });

  test("renders Add Resource button", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    await expect(page.getByText("Add Resource")).toBeVisible();
  });

  test("renders resource type badges", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    await expect(page.getByText("Equipment")).toBeVisible();
    await expect(page.getByText("Labor")).toBeVisible();
    await expect(page.getByText("Material")).toBeVisible();
  });

  test("renders timeline header", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const header = page.getByTestId("resource-timeline-header");
    await expect(header).toBeVisible();
  });

  test("clicking a resource highlights it", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const row = page.getByTestId("resource-row-res-1");
    await expect(row).toBeVisible();
    await row.click();
    await expect(row).toHaveAttribute("data-selected", "true");
  });
});
