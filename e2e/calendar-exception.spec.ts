import { test, expect } from "@playwright/test";

const STORY_URL =
  "/iframe.html?id=planner-calendarsettingsmodal--default&viewMode=story";

test.describe("Calendar Exception Modal E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(STORY_URL);
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
  });

  test("calendar settings modal renders with calendars and exceptions", async ({
    page,
  }) => {
    await expect(
      page.getByText("Standard 5-Day Work Week").first(),
    ).toBeVisible();
    await expect(page.getByText("6-Day Work Week")).toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
    await expect(page.getByText("New Year's Day").first()).toBeVisible();
    await expect(page.getByText("Republic Day").first()).toBeVisible();
  });

  test("clicking Add Exception shows inline exception editor", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Still just one dialog — editor is inline, not a stacked modal
    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(1);
  });

  test("exception editor shows exceptions from the selected calendar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog.getByText("New Year's Day")).toBeVisible();
    await expect(dialog.getByText("Republic Day")).toBeVisible();
  });

  test("renders exception type pills (Holiday, Non-Working, Misc)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog.getByText("Type")).toBeVisible();
    await expect(dialog.getByText("Holiday", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Non-Working", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Misc", { exact: true })).toBeVisible();
  });

  test("renders time inputs", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']");
    const timeInputs = dialog.locator("input[type='time']");
    await expect(timeInputs).toHaveCount(2);
    await expect(dialog.getByText("to")).toBeVisible();
  });

  test("can fill the exception form and save", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    await page.getByPlaceholder("Enter exception name").fill("Diwali");
    await page.getByPlaceholder("DD / MM / YYYY").fill("12 / 11 / 2026");

    const dialog = page.locator("[role='dialog']");
    await dialog
      .getByPlaceholder("e.g. New Year's Day, Company Holiday...")
      .fill("Festival of lights");

    const saveBtn = page.getByRole("button", { name: "Save Exception" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.getByPlaceholder("Enter exception name")).toHaveValue("");
  });

  test("clicking an exception auto-fills the form", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']");
    await dialog.getByText("New Year's Day").click();

    await expect(page.getByPlaceholder("Enter exception name")).toHaveValue(
      "New Year's Day",
    );
    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "01 / 01 / 2026",
    );
    await expect(dialog.getByText("January 2026")).toBeVisible();
  });

  test("delete exception shows confirmation and removes it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']").first();
    await dialog.getByLabel("Delete New Year's Day").click();

    await expect(page.getByText("Delete Exception")).toBeVisible();

    // Settings modal + delete confirm = 2 overlays
    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(2);

    await page
      .getByRole("button", { name: "Delete" })
      .filter({ hasText: /^Delete$/ })
      .last()
      .click();

    await expect(page.getByText("Delete Exception")).not.toBeVisible({
      timeout: 1000,
    });
  });

  test("Escape collapses inline editor back to calendar details", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("nested Escape: confirm → editor → settings", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']").first();
    await dialog.getByLabel("Delete New Year's Day").click();
    await expect(page.getByText("Delete Exception")).toBeVisible();

    // Escape closes delete confirm
    await page.keyboard.press("Escape");
    await expect(page.getByText("Delete Exception")).not.toBeVisible();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Escape collapses inline editor back to calendar details
    await page.keyboard.press("Escape");
    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("date picker syncs with date input", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const dialog = page.locator("[role='dialog']");

    await page.getByPlaceholder("DD / MM / YYYY").fill("15 / 03 / 2026");
    await expect(dialog.getByText("March 2026")).toBeVisible();

    await dialog
      .getByTestId("mini-calendar")
      .getByText("20", { exact: true })
      .click();

    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "20 / 03 / 2026",
    );
  });
});
