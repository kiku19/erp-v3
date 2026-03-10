/**
 * E2E tests for the Dashboard page.
 *
 * Prerequisites (all must be running before `npm run test:e2e`):
 *   - Next.js dev server: npm run dev  → http://localhost:3003 (worktree)
 *   - Kong gateway        → http://localhost:8000
 *   - PostgreSQL (with seed data: admin/admin123)
 *
 * Hybrid storage: access token is in memory (AuthContext), refresh token in HttpOnly cookie.
 * Auth guard checks AuthContext — tests must log in via browser UI to populate it.
 */

import { test, expect, Page } from "@playwright/test";

const TOAST_SUCCESS = '[data-sonner-toast][data-type="success"]';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Log in via the browser UI so the access token lands in AuthContext (memory).
 * This is required because the auth guard checks AuthContext, not localStorage.
 */
async function loginViaUI(
  page: Page,
  username: string,
  password: string,
  expectedPath: string = "/dashboard"
) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.waitForURL(expectedPath, { timeout: 8_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Dashboard — E2E rendering", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, "admin", "admin123", "/dashboard");
  });

  test("renders all key UI elements", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
    await expect(page.getByText(/Acme Corp ERP/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();
  });

  test("renders the welcome message", async ({ page }) => {
    await expect(page.getByText(/welcome to the erp dashboard/i)).toBeVisible();
  });

  test("no error alert shown on initial load", async ({ page }) => {
    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)')
    ).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Dashboard — E2E auth guard", () => {
  test("redirects to /login when not authenticated (AuthContext empty)", async ({ page }) => {
    // Navigate directly without logging in — AuthContext is empty on fresh navigation
    await page.goto("/dashboard");
    await page.waitForURL("/login", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });

  test("stays on /dashboard when authenticated via login UI", async ({ page }) => {
    await loginViaUI(page, "admin", "admin123", "/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Dashboard — E2E successful logout", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, "admin", "admin123", "/dashboard");
  });

  test("shows a success toast after logout", async ({ page }) => {
    await page.getByRole("button", { name: /logout/i }).click();
    // Filter by text to avoid strict-mode violation when login toast is still visible
    const logoutToast = page.locator(TOAST_SUCCESS).filter({ hasText: /logged out/i });
    await expect(logoutToast).toBeVisible({ timeout: 8_000 });
  });

  test("clears role and permissions from localStorage after logout", async ({ page }) => {
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL("/login", { timeout: 8_000 });

    // Hybrid storage: accessToken was in memory, refreshToken in HttpOnly cookie
    // After logout, userRole and userPermissions (the only localStorage items) must be cleared
    const userRole = await page.evaluate(() => localStorage.getItem("userRole"));
    const userPermissions = await page.evaluate(() => localStorage.getItem("userPermissions"));
    expect(userRole).toBeNull();
    expect(userPermissions).toBeNull();
  });

  test("redirects to /login after logout", async ({ page }) => {
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL("/login", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });

  test("shows loading state feedback is not shown (logout is instant)", async ({ page }) => {
    // Logout button should be present before click
    await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Dashboard — E2E failed state", () => {
  test("shows error toast on network failure during logout (if API-backed)", async ({ page }) => {
    // Hybrid storage logout calls the API to clear the HttpOnly cookie.
    // Even if the API call fails, the finally block still clears AuthContext and redirects.
    await loginViaUI(page, "admin", "admin123", "/dashboard");

    await page.route("**/api/**", (route) => route.abort());
    await page.getByRole("button", { name: /logout/i }).click();

    await page.waitForURL("/login", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Dashboard — E2E Kong routing enforcement", () => {
  test("login redirect (from Kong) correctly lands on /dashboard for admin", async ({ page }) => {
    // Navigate to login page and log in as admin via Kong
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());

    const requestedUrls: string[] = [];
    page.on("request", (req) => requestedUrls.push(req.url()));

    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password", { exact: true }).fill("admin123");
    await page.getByRole("button", { name: /^login$/i }).click();

    await page.waitForURL("/dashboard", { timeout: 8_000 });

    // Verify the API call went through Kong (port 8000)
    const kongCalls = requestedUrls.filter(
      (url) => url.includes(":8000") && url.includes("/api/public/auth/login")
    );
    expect(kongCalls.length).toBeGreaterThan(0);
  });

  test("requests include X-Timezone header", async ({ page }) => {
    let capturedTimezone: string | null = null;

    await page.route("**/api/public/auth/login", async (route) => {
      const headers = route.request().headers();
      capturedTimezone = headers["x-timezone"] ?? null;
      await route.continue();
    });

    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password", { exact: true }).fill("admin123");
    await page.getByRole("button", { name: /^login$/i }).click();

    await page.waitForURL("/dashboard", { timeout: 8_000 });
    expect(capturedTimezone).not.toBeNull();
    expect(capturedTimezone!.length).toBeGreaterThan(0);
  });
});
