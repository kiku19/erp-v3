import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-sidebar";

test.describe("Sidebar Component E2E", () => {
  test("floating sidebar renders with fixed positioning and icons only", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/fixed/);
    await expect(sidebar).toHaveClass(/w-16/);
    await expect(sidebar).toHaveClass(/bg-background/);
  });

  test("sidebar has correct 64px width", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(64);
  });

  test("sidebar floats over content without pushing layout", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    // Content should be at x=0 (not pushed by sidebar)
    const main = page.locator("main");
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.x).toBe(0);
  });

  test("nav items have hover transition", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    const navItem = page.getByTestId("nav-item").first();
    await expect(navItem).toHaveClass(/transition-all/);
  });

  test("tooltips appear on nav item hover", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    // Hover over Dashboard item (first tooltip-wrapped item)
    const dashboardItem = page.getByTestId("nav-item").first();
    await dashboardItem.hover();
    // Wait for tooltip delay
    await page.waitForTimeout(300);
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("Dashboard");
  });

  test("flyout menu appears for items with sub-items", async ({ page }) => {
    await page.goto(`${STORY_URL}--floating-sidebar&viewMode=story`);
    const productsWrapper = page.getByTestId("nav-item-wrapper").first();
    await productsWrapper.hover();
    const flyout = page.getByTestId("nav-flyout");
    await expect(flyout).toBeVisible();
    await expect(page.getByTestId("nav-flyout-header")).toHaveText("Products");
  });

  test("auto-hide sidebar hides after 1 second", async ({ page }) => {
    await page.goto(`${STORY_URL}--auto-hide-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    // Sidebar should be visible initially (starts open)
    await expect(sidebar).toBeVisible();
    // Move cursor away from sidebar
    await page.mouse.move(500, 500);
    // Wait for 1s auto-hide + 300ms animation
    await page.waitForTimeout(1500);
    await expect(sidebar).not.toBeVisible();
  });

  test("trigger zone reveals sidebar on hover", async ({ page }) => {
    await page.goto(`${STORY_URL}--auto-hide-sidebar&viewMode=story`);
    // Wait for sidebar to auto-hide
    await page.mouse.move(500, 500);
    await page.waitForTimeout(1500);
    // Hover top-left corner (trigger zone)
    await page.mouse.move(5, 5);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
  });

  test("sidebar stays visible while cursor is over it", async ({ page }) => {
    await page.goto(`${STORY_URL}--auto-hide-sidebar&viewMode=story`);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    // Keep cursor on sidebar
    await page.mouse.move(32, 200);
    await page.waitForTimeout(2000);
    // Should still be visible since cursor is on it
    await expect(sidebar).toBeVisible();
  });
});
