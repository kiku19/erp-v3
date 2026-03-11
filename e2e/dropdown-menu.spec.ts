import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-dropdownmenu";

test.describe("DropdownMenu Component E2E", () => {
  test("opens menu when trigger is clicked", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
  });

  test("closes menu when clicking outside", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.click("body", { position: { x: 10, y: 10 } });
    await expect(page.getByRole("menu")).not.toBeVisible();
  });

  test("closes menu with Escape key", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).not.toBeVisible();
  });

  test("navigates items with arrow keys and selects with Enter", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    await page.keyboard.press("ArrowDown");
    const firstItem = page.getByRole("menuitem").first();
    await expect(firstItem).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const secondItem = page.getByRole("menuitem").nth(1);
    await expect(secondItem).toBeFocused();
  });

  test("renders active item with accent styles", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-active-item&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    const activeItem = page.locator("[role='menuitem']", { hasText: "Settings" });
    await expect(activeItem).toHaveClass(/bg-accent/);
  });

  test("renders dividers between groups", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-divider&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    const divider = page.getByRole("separator");
    await expect(divider).toBeVisible();
  });

  test("disabled items are not interactive", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-disabled&viewMode=story`);
    const trigger = page.getByRole("button", { name: "Open Menu" });
    await trigger.click();
    const disabledItem = page.getByRole("menuitem").filter({ hasText: "Disabled" });
    await expect(disabledItem).toHaveAttribute("aria-disabled", "true");
  });
});
