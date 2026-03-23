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

  test("clicking Add Exception opens the exception modal on top", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(2);
  });

  test("exception modal shows exceptions from the selected calendar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();
    await expect(exceptionModal.getByText("New Year's Day")).toBeVisible();
    await expect(exceptionModal.getByText("Republic Day")).toBeVisible();
  });

  test("renders hardcoded exception type pills (Holiday, Non-Working, Misc)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Exception type pills are in the right panel — use the modal's form area
    const exModal = page.locator("[role='dialog']").last();
    await expect(exModal.getByText("Exception Type")).toBeVisible();
    await expect(exModal.getByText("Holiday", { exact: true })).toBeVisible();
    await expect(exModal.getByText("Non-Working", { exact: true })).toBeVisible();
    await expect(exModal.getByText("Misc", { exact: true })).toBeVisible();
  });

  test("renders time inputs (Start Time and End Time)", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exModal = page.locator("[role='dialog']").last();
    await expect(exModal.getByText("Start Time")).toBeVisible();
    await expect(exModal.getByText("End Time")).toBeVisible();
  });

  test("can fill the exception form and save", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    await page.getByPlaceholder("Enter exception name").fill("Diwali");
    await page.getByPlaceholder("DD / MM / YYYY").fill("12 / 11 / 2026");

    const exModal = page.locator("[role='dialog']").last();
    await exModal
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

    const exceptionModal = page.locator("[role='dialog']").last();
    await exceptionModal.getByText("New Year's Day").click();

    await expect(page.getByPlaceholder("Enter exception name")).toHaveValue(
      "New Year's Day",
    );
    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "01 / 01 / 2026",
    );
    await expect(exceptionModal.getByText("January 2026")).toBeVisible();
  });

  test("delete exception shows confirmation and removes it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();
    await exceptionModal.getByLabel("Delete New Year's Day").click();

    await expect(page.getByText("Delete Exception")).toBeVisible();

    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(3);

    await page
      .getByRole("button", { name: "Delete" })
      .filter({ hasText: /^Delete$/ })
      .last()
      .click();

    await expect(page.getByText("Delete Exception")).not.toBeVisible({
      timeout: 1000,
    });
  });

  test("Escape closes only the topmost modal", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("nested Escape: confirm → exception → settings", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();
    await exceptionModal.getByLabel("Delete New Year's Day").click();
    await expect(page.getByText("Delete Exception")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Delete Exception")).not.toBeVisible();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("date picker syncs with date input", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();

    await page.getByPlaceholder("DD / MM / YYYY").fill("15 / 03 / 2026");
    await expect(exceptionModal.getByText("March 2026")).toBeVisible();

    await exceptionModal
      .getByTestId("mini-calendar")
      .getByText("20", { exact: true })
      .click();

    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "20 / 03 / 2026",
    );
  });
});
