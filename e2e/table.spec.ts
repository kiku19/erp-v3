import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-datatable";

test.describe("Table Component E2E", () => {
  test("default table renders with header and body rows", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    const headers = page.getByRole("columnheader");
    await expect(headers).toHaveCount(5);
    const rows = page.getByRole("row");
    // 1 header row + 4-5 data rows
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("header cells have muted-foreground text color", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const headerCell = page.getByRole("columnheader").first();
    await expect(headerCell).toBeVisible();
    await expect(headerCell).toHaveClass(/text-muted-foreground/);
  });

  test("data cells have foreground text color", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const cell = page.getByRole("cell").first();
    await expect(cell).toBeVisible();
    await expect(cell).toHaveClass(/text-foreground/);
  });

  test("table rows have border-bottom styling", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const rows = page.getByRole("row");
    const firstDataRow = rows.nth(1);
    await expect(firstDataRow).toBeVisible();
    await expect(firstDataRow).toHaveClass(/border-b/);
  });

  test("table is full width", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table).toHaveClass(/w-full/);
  });
});
