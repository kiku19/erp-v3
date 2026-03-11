import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=ui-avatar";

test.describe("Avatar Component E2E", () => {
  test("renders default avatar with initials", async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`);
    const avatar = page.locator("[data-testid='avatar']");
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveClass(/rounded-full/);
    await expect(avatar).toContainText("JD");
  });

  test("renders small avatar", async ({ page }) => {
    await page.goto(`${STORY_URL}--small&viewMode=story`);
    const avatar = page.locator("[data-testid='avatar']");
    await expect(avatar).toBeVisible();
    const box = await avatar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThan(40);
  });

  test("renders avatar with image", async ({ page }) => {
    await page.goto(`${STORY_URL}--with-image&viewMode=story`);
    const avatar = page.locator("[data-testid='avatar']");
    await expect(avatar).toBeVisible();
    const img = avatar.locator("img");
    await expect(img).toBeVisible();
  });

  test("renders all sizes together", async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`);
    const avatars = page.locator("[data-testid='avatar']");
    await expect(avatars).toHaveCount(3);
  });
});
