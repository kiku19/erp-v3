import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-sidebar";

test.describe("Sidebar Component E2E", () => {
  test("full sidebar renders with header, nav, and footer", async ({ page }) => {
    await page.goto(`${STORY_URL}--full-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/bg-background/);
    // Brand text
    await expect(page.getByText("ERP System")).toBeVisible();
    // Nav items
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Products")).toBeVisible();
    // Footer
    await expect(page.getByText("JD")).toBeVisible();
    await expect(page.getByText("John Doe")).toBeVisible();
  });

  test("collapsed sidebar hides text and shows only icons", async ({ page }) => {
    await page.goto(`${STORY_URL}--collapsed-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    // Brand text should not be visible
    await expect(page.getByText("ERP System")).not.toBeVisible();
    // Nav labels should not be visible
    await expect(page.getByText("Dashboard")).not.toBeVisible();
    // Footer name should not be visible
    await expect(page.getByText("John Doe")).not.toBeVisible();
  });

  test("active nav item has accent background", async ({ page }) => {
    await page.goto(`${STORY_URL}--full-sidebar&viewMode=story`);
    // Dashboard is the active item
    const activeItem = page.getByTestId("nav-item").filter({ hasText: "Dashboard" });
    await expect(activeItem).toHaveClass(/bg-accent/);
  });

  test("nav items have hover transition", async ({ page }) => {
    await page.goto(`${STORY_URL}--full-sidebar&viewMode=story`);
    const navItem = page.getByTestId("nav-item").filter({ hasText: "Products" });
    await expect(navItem).toHaveClass(/transition-all/);
  });

  test("toggleable sidebar can switch between expanded and collapsed", async ({ page }) => {
    await page.goto(`${STORY_URL}--toggleable-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    // Initially expanded
    await expect(page.getByText("ERP System")).toBeVisible();
    // Click the toggle button
    const toggleBtn = page.getByRole("button", { name: /toggle/i });
    await toggleBtn.click();
    // Should now be collapsed - brand text hidden
    await expect(page.getByText("ERP System")).not.toBeVisible();
    // Click again to expand
    await toggleBtn.click();
    await expect(page.getByText("ERP System")).toBeVisible();
  });

  test("sidebar has correct expanded width", async ({ page }) => {
    await page.goto(`${STORY_URL}--full-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(260);
  });

  test("section titles render in expanded state", async ({ page }) => {
    await page.goto(`${STORY_URL}--full-sidebar&viewMode=story`);
    await expect(page.getByText("MAIN")).toBeVisible();
    await expect(page.getByText("MANAGEMENT")).toBeVisible();
  });
});
