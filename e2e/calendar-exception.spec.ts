import { test, expect } from "@playwright/test";

const STORY_URL =
  "/iframe.html?id=planner-calendarsettingsmodal--default&viewMode=story";

test.describe("Calendar Exception Modal E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Set a taller viewport so the full modal is visible
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(STORY_URL);
    // Wait for the Calendar Settings modal dialog to be visible
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
  });

  test("calendar settings modal renders with calendars and exceptions", async ({
    page,
  }) => {
    // Left panel shows calendars (use first match — the list item)
    await expect(
      page.getByText("Standard 5-Day Work Week").first(),
    ).toBeVisible();
    await expect(page.getByText("6-Day Work Week")).toBeVisible();

    // Right panel shows exceptions section
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
    await expect(page.getByText("New Year's Day").first()).toBeVisible();
    await expect(page.getByText("Republic Day").first()).toBeVisible();
  });

  test("clicking Add Exception opens the exception modal on top", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();

    // The exception modal should open — look for "Existing Exceptions" which is unique to it
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Should have 2 overlays stacked
    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(2);
  });

  test("exception modal shows exceptions from the selected calendar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // The exception modal (last dialog) should show calendar's exceptions
    const exceptionModal = page.locator("[role='dialog']").last();
    await expect(exceptionModal.getByText("New Year's Day")).toBeVisible();
    await expect(exceptionModal.getByText("Republic Day")).toBeVisible();
  });

  test("can fill the exception form and save", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Fill the form
    await page.getByPlaceholder("Enter exception name").fill("Diwali");
    await page.getByPlaceholder("DD / MM / YYYY").fill("12 / 11 / 2026");

    // Type in the reason (inside the exception modal dialog)
    const exModal = page.locator("[role='dialog']").last();
    await exModal
      .getByPlaceholder("e.g. New Year's Day, Company Holiday...")
      .fill("Festival of lights");

    // Selected date info should appear
    await expect(page.getByText(/Selected:.*November 12, 2026/)).toBeVisible();

    const saveBtn = page.getByRole("button", { name: "Save Exception" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Form should reset after save
    await expect(page.getByPlaceholder("Enter exception name")).toHaveValue("");
  });

  test("clicking an exception auto-fills the form", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();

    // Click on "New Year's Day" in the exception modal's left panel
    await exceptionModal.getByText("New Year's Day").click();

    // Form should auto-fill
    await expect(page.getByPlaceholder("Enter exception name")).toHaveValue(
      "New Year's Day",
    );

    // Date should be filled
    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "01 / 01 / 2026",
    );

    // Calendar should navigate to January 2026
    await expect(exceptionModal.getByText("January 2026")).toBeVisible();
  });

  test("delete exception shows confirmation and removes it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // The delete button has aria-label "Delete New Year's Day"
    // It's inside the exception modal (last dialog)
    const exceptionModal = page.locator("[role='dialog']").last();
    await exceptionModal.getByLabel("Delete New Year's Day").click();

    // Confirmation dialog should appear
    await expect(page.getByText("Delete Exception")).toBeVisible();
    await expect(
      page.getByText(/Are you sure you want to delete/),
    ).toBeVisible();

    // 3 overlays stacked (settings + exception + confirmation)
    const overlays = page.locator("[data-testid='modal-overlay']");
    await expect(overlays).toHaveCount(3);

    // Click Delete to confirm (the destructive button in the confirmation dialog)
    await page
      .getByRole("button", { name: "Delete" })
      .filter({ hasText: /^Delete$/ })
      .last()
      .click();

    // Confirmation should close (wait for animation)
    await expect(page.getByText("Delete Exception")).not.toBeVisible({
      timeout: 1000,
    });
  });

  test("Escape closes only the topmost modal", async ({ page }) => {
    // Open exception modal
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Press Escape — should close exception modal only
    await page.keyboard.press("Escape");

    // Exception modal should be gone
    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();

    // Settings modal should still be open
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("nested Escape: confirm → exception → settings", async ({ page }) => {
    // Open exception modal
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Open delete confirmation
    const exceptionModal = page.locator("[role='dialog']").last();
    await exceptionModal.getByLabel("Delete New Year's Day").click();
    await expect(page.getByText("Delete Exception")).toBeVisible();

    // Escape 1: close confirmation
    await page.keyboard.press("Escape");
    await expect(page.getByText("Delete Exception")).not.toBeVisible();
    // Exception modal still visible
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Escape 2: close exception modal
    await page.keyboard.press("Escape");
    await expect(page.getByText("Existing Exceptions")).not.toBeVisible();
    // Settings modal still visible
    await expect(page.getByText("Exceptions & Holidays")).toBeVisible();
  });

  test("date picker syncs with date input", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    const exceptionModal = page.locator("[role='dialog']").last();

    // Type a date
    await page.getByPlaceholder("DD / MM / YYYY").fill("15 / 03 / 2026");

    // Calendar should show March 2026
    await expect(exceptionModal.getByText("March 2026")).toBeVisible();

    // Click a different day on the calendar (20th)
    await exceptionModal
      .getByTestId("mini-calendar")
      .getByText("20", { exact: true })
      .click();

    // Date input should update
    await expect(page.getByPlaceholder("DD / MM / YYYY")).toHaveValue(
      "20 / 03 / 2026",
    );
  });

  test("Add Exception Type via + button", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Click the + button
    await page.getByLabel("Add exception type").click();

    // AddExceptionType modal should appear
    await expect(page.getByText("Add Exception Type")).toBeVisible();

    // Fill in the type name
    await page
      .getByPlaceholder("e.g. Company Event, Maintenance...")
      .fill("Company Event");

    // Select Green color
    await page.getByText("Green").click();

    // Click Add Type
    await page.getByRole("button", { name: "Add Type" }).click();

    // Modal should close and new type should appear in the pills
    await expect(page.getByText("Add Exception Type")).not.toBeVisible();
    await expect(page.getByText("Company Event")).toBeVisible();
  });

  test("delete exception type via hover × button", async ({ page }) => {
    await page.getByRole("button", { name: "Add Exception" }).click();
    await expect(page.getByText("Existing Exceptions")).toBeVisible();

    // Hover over the "Non-Working" pill to reveal the × button
    const nonWorkingPill = page.getByRole("button", { name: "Non-Working" });
    await nonWorkingPill.hover();

    // Click the × delete button (appears on hover)
    const deleteTypeBtn = page.getByLabel("Delete type Non-Working");
    await expect(deleteTypeBtn).toBeVisible();
    await deleteTypeBtn.click();

    // Confirmation modal should appear
    await expect(page.getByText("Delete Exception Type")).toBeVisible();
    await expect(
      page.getByText(/Are you sure you want to delete the "Non-Working"/),
    ).toBeVisible();

    // Click Delete to confirm
    await page
      .getByRole("button", { name: "Delete" })
      .filter({ hasText: /^Delete$/ })
      .last()
      .click();

    // Confirmation should close
    await expect(page.getByText("Delete Exception Type")).not.toBeVisible();

    // "Non-Working" pill should be gone
    await expect(
      page.getByLabel("Delete type Non-Working"),
    ).not.toBeVisible();

    // Other types should still be present
    await expect(page.getByLabel("Delete type Holiday")).toBeAttached();
    await expect(page.getByLabel("Delete type Half Day")).toBeAttached();
  });
});
