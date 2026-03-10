/**
 * E2E tests for the Login page.
 *
 * Prerequisites (all must be running before `npm run test:e2e`):
 *   - Next.js dev server: npm run dev  → http://localhost:3002
 *   - Kong gateway        → http://localhost:8000
 *   - PostgreSQL (with seed data: admin/admin123)
 *
 * The login page calls Kong at NEXT_PUBLIC_KONG_BASE_URL.
 * These tests exercise the full stack: browser → Next.js → Kong → DB.
 */

import { test, expect, Page } from "@playwright/test";

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_USERNAME = "admin";
const VALID_PASSWORD = "admin123";
const WRONG_PASSWORD = "wrongpassword_xyz_invalid";
const SUPERADMIN_USERNAME = "superadmin";
const SUPERADMIN_PASSWORD = "superadmin123";

// Sonner renders toast elements with [data-sonner-toast].
// Each toast carries data-type="success" | "error" | "info" | "warning".
const TOAST_SUCCESS = '[data-sonner-toast][data-type="success"]';
const TOAST_ERROR = '[data-sonner-toast][data-type="error"]';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoLoginAndClear(page: Page) {
  // Clear storage so no stale tokens influence the test
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function fillAndSubmit(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Login Page — E2E rendering", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoginAndClear(page);
  });

  test("renders the login form with all required elements", async ({ page }) => {
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Login");
  });

  test("password field is hidden by default", async ({ page }) => {
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  });

  test("password becomes visible when eye toggle is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  });

  test("no error alert is shown on initial load", async ({ page }) => {
    // Next.js App Router injects a route-announcer with role="alert" for a11y.
    // Exclude it — we only want to assert our form's error element is absent.
    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)')
    ).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login Page — E2E successful login", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoginAndClear(page);
  });

  test("shows a success toast after valid credentials are submitted", async ({
    page,
  }) => {
    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    // The success toast must appear
    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator(TOAST_SUCCESS)).toContainText(/login successful/i);
  });

  test("stores userRole in localStorage after successful login (accessToken is in memory)", async ({
    page,
  }) => {
    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    // Wait for the toast to confirm the response was processed
    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 8_000 });

    // Hybrid storage: accessToken is in AuthContext (memory), NOT localStorage.
    // The login page stores userRole and userPermissions in localStorage for initial render.
    const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(accessToken).toBeNull(); // accessToken is in memory, not localStorage

    const userRole = await page.evaluate(() => localStorage.getItem("userRole"));
    expect(userRole).not.toBeNull();
    expect(["user", "admin", "superadmin"]).toContain(userRole);
  });

  test("refreshToken is NOT stored in localStorage (it is in HttpOnly cookie)", async ({
    page,
  }) => {
    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 8_000 });

    // Hybrid storage: refresh token is set as an HttpOnly cookie by the backend.
    // HttpOnly cookies are inaccessible to JavaScript — localStorage must be empty.
    const token = await page.evaluate(() => localStorage.getItem("refreshToken"));
    expect(token).toBeNull();
  });

  test("redirects to /dashboard (defaultRedirectPath) after admin login", async ({ page }) => {
    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    await page.waitForURL("/dashboard", { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("redirects to /admin-panel after superadmin login", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => { localStorage.clear(); });
    await fillAndSubmit(page, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD);

    await page.waitForURL("/admin-panel", { timeout: 8_000 });
    expect(page.url()).toContain("/admin-panel");
  });

  test("redirects to the ?redirect param path when present in URL", async ({ page }) => {
    await page.goto("/login?redirect=/dashboard");
    await page.evaluate(() => { localStorage.clear(); });
    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    await page.waitForURL("/dashboard", { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("submit button shows 'Signing in…' while the request is in-flight", async ({
    page,
  }) => {
    await page.getByLabel("Username").fill(VALID_USERNAME);
    await page.getByLabel("Password", { exact: true }).fill(VALID_PASSWORD);

    // Click submit and immediately check the loading state
    await page.getByRole("button", { name: /^login$/i }).click();

    // The button text should change to "Signing in…" while in-flight
    await expect(
      page.getByRole("button", { name: /signing in/i })
    ).toBeDisabled({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login Page — E2E failed login", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoginAndClear(page);
  });

  test("shows an error toast for invalid credentials", async ({ page }) => {
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    // The error toast must appear
    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });
  });

  test("error toast contains a meaningful error message", async ({ page }) => {
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });
    // Message must not be empty
    const text = await page.locator(TOAST_ERROR).textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("does NOT store tokens in localStorage on failed login", async ({
    page,
  }) => {
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });

    const access = await page.evaluate(() => localStorage.getItem("accessToken"));
    const refresh = await page.evaluate(() =>
      localStorage.getItem("refreshToken")
    );
    expect(access).toBeNull();
    expect(refresh).toBeNull();
  });

  test("does NOT redirect on failed login", async ({ page }) => {
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });

  test("shows an error toast on network failure", async ({ page }) => {
    // Simulate network failure by aborting all fetch requests to the login endpoint
    await page.route("**/api/public/auth/login", (route) => route.abort());

    await fillAndSubmit(page, VALID_USERNAME, VALID_PASSWORD);

    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator(TOAST_ERROR)).toContainText(/unable to connect/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login Page — E2E Kong routing enforcement", () => {
  test("all API calls go through Kong (NEXT_PUBLIC_KONG_BASE_URL), never direct to app server", async ({
    page,
  }) => {
    const directAppCalls: string[] = [];

    // Flag any request that bypasses Kong and hits the app server directly
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("localhost:3002") &&
        url.includes("/api/public/auth/login")
      ) {
        directAppCalls.push(url);
      }
    });

    await gotoLoginAndClear(page);
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    // Give it time to complete
    await page.waitForTimeout(3_000);

    // The browser-side fetch must NOT have called localhost:3002 directly
    expect(directAppCalls).toHaveLength(0);
  });

  test("requests to Kong include X-Timezone header", async ({ page }) => {
    let capturedTimezone: string | null = null;

    // Intercept the request to Kong to inspect headers
    await page.route("**/api/public/auth/login", async (route) => {
      const headers = route.request().headers();
      capturedTimezone = headers["x-timezone"] ?? null;
      // Continue normally (don't abort — let Kong handle it)
      await route.continue();
    });

    await gotoLoginAndClear(page);
    await fillAndSubmit(page, VALID_USERNAME, WRONG_PASSWORD);

    await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });

    expect(capturedTimezone).not.toBeNull();
    expect(capturedTimezone!.length).toBeGreaterThan(0);
  });
});
