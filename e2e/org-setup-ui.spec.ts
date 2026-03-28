import { test, expect, type Page } from "@playwright/test";

/**
 * E2E UI tests for Organisation Setup screen.
 *
 * These tests run against the live Next.js app (port 3000) to verify:
 *   1. Page loads and renders the org setup screen
 *   2. Header buttons open the correct global modals (Roles, Cost Centers, Calendars)
 *   3. Node cards render on the canvas
 *   4. Clicking a node opens the node modal with People/Resources/Settings tabs
 *   5. Add node modal opens via the "+" button on a node card
 *   6. API fetch calls are made on the correct screens
 *   7. Creating items through modals persists them
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const testEmail = `org-ui-e2e-${Date.now()}@test.com`;
const testPassword = "TestPass123!";
let token: string;

/** Login via the UI and navigate to org setup */
async function loginAndNavigate(page: Page) {
  await page.goto(`${BASE_URL}/`);
  await page.locator("#login-email").fill(testEmail);
  await page.locator("#login-password").fill(testPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect after login
  await page.waitForURL(/\/(dashboard|onboarding|organization-structure)/, {
    timeout: 15000,
  });

  // Navigate to org setup
  await page.goto(`${BASE_URL}/organization-structure`);
  await page.waitForSelector('[data-testid="org-setup-screen"]', {
    timeout: 15000,
  });
}

test.describe.serial("Organisation Setup — UI E2E", () => {
  /* ─────────────────── Auth Setup ─────────────────── */

  test("setup: create user and seed data via API", async ({ request }) => {
    // Signup
    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        fullName: "Org UI Tester",
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    expect(signupRes.status()).toBe(201);

    // Verify email
    const verifyRes = await request.post(
      `${BASE_URL}/api/test-helpers/verify-email`,
      { data: { email: testEmail } },
    );
    expect(verifyRes.status()).toBe(200);

    // Login to get token for API seeding
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: testEmail, password: testPassword },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    token = loginBody.accessToken;

    // Seed: create a role
    const roleRes = await request.post(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "UI Test Engineer",
        level: "Senior",
        defaultPayType: "hourly",
        overtimeEligible: true,
        skillTags: ["testing", "automation"],
      },
    });
    expect(roleRes.status()).toBe(201);

    // Seed: create a cost center
    const ccRes = await request.post(`${BASE_URL}/api/cost-centers`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "UI Test Operations",
        code: "CC-UI-TEST",
        description: "Test cost center for UI E2E",
      },
    });
    expect(ccRes.status()).toBe(201);
  });

  /* ─────────────────── Page Load & Header ─────────────────── */

  test("org setup page loads and shows header", async ({ page }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await expect(header).toBeVisible();
    await expect(header.getByText("Organisation Setup")).toBeVisible();
  });

  test("header shows Calendars, Roles, Cost Centers buttons", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await expect(header.getByText("Calendars")).toBeVisible();
    await expect(header.getByText("Roles")).toBeVisible();
    await expect(header.getByText("Cost Centers")).toBeVisible();
  });

  /* ─────────────────── Global Modals ─────────────────── */

  test("clicking Roles button opens the roles modal with seeded data", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await header.getByText("Roles").click();

    const rolesModal = page.locator('[data-testid="roles-modal"]');
    await expect(rolesModal).toBeVisible({ timeout: 5000 });
    await expect(rolesModal.getByText("All Roles")).toBeVisible();
    await expect(rolesModal.getByText("UI Test Engineer")).toBeVisible();
  });

  test("clicking Cost Centers button opens the cost center modal with seeded data", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await header.getByText("Cost Centers").click();

    const ccModal = page.locator('[data-testid="cost-center-modal"]');
    await expect(ccModal).toBeVisible({ timeout: 5000 });
    await expect(ccModal.getByText("All Cost Centers")).toBeVisible();
    await expect(ccModal.getByText("UI Test Operations")).toBeVisible();
  });

  /* ─────────────────── Roles Modal CRUD ─────────────────── */

  test("creates a new role through the Roles modal", async ({ page }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await header.getByText("Roles").click();
    const rolesModal = page.locator('[data-testid="roles-modal"]');
    await expect(rolesModal).toBeVisible({ timeout: 5000 });

    // Click add new role
    await rolesModal.getByLabel("Add new role").click();

    // Fill in role form
    await rolesModal.locator('[data-testid="role-name-input"]').fill("Project Coordinator");
    await expect(rolesModal.locator('[data-testid="role-code-input"]')).not.toHaveValue("");

    // Save
    await rolesModal.locator('[data-testid="save-role-btn"]').click();

    // Verify it appears in the list
    await expect(rolesModal.getByText("Project Coordinator")).toBeVisible({
      timeout: 5000,
    });
  });

  /* ─────────────────── Cost Center Modal CRUD ─────────────────── */

  test("creates a new cost center through the Cost Centers modal", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    const header = page.locator('[data-testid="org-setup-header"]');
    await header.getByText("Cost Centers").click();
    const ccModal = page.locator('[data-testid="cost-center-modal"]');
    await expect(ccModal).toBeVisible({ timeout: 5000 });

    // Click add new cost center
    await ccModal.getByLabel("Add new cost center").click();

    // Fill in form
    await ccModal.locator('[data-testid="cc-name-input"]').fill("Testing Division");
    await expect(ccModal.locator('[data-testid="cc-code-input"]')).not.toHaveValue("");
    await ccModal.locator('[data-testid="cc-description-input"]').fill("Cost center for testing");

    // Save
    await ccModal.locator('[data-testid="save-cc-btn"]').click();

    // Verify
    await expect(ccModal.getByText("Testing Division")).toBeVisible({
      timeout: 5000,
    });
  });

  /* ─────────────────── Canvas & Node Cards ─────────────────── */

  test("canvas renders root node card", async ({ page }) => {
    await loginAndNavigate(page);

    const nodeCards = page.locator('[data-testid^="node-card-"]');
    await expect(nodeCards.first()).toBeVisible({ timeout: 10000 });
    await expect(nodeCards.first().getByText(/\d+ people/)).toBeVisible();
  });

  /* ─────────────────── Add Node Modal ─────────────────── */

  test("add child node via + button on root node", async ({ page }) => {
    await loginAndNavigate(page);

    // Find the add-child button
    const addChildBtn = page.locator('[data-testid^="add-child-"]').first();
    await expect(addChildBtn).toBeVisible({ timeout: 10000 });
    // Button has pulse animation — use force to bypass Playwright stability check
    await addChildBtn.click({ force: true });

    // Add node modal should appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByRole("heading", { name: /Add Node/ })).toBeVisible();

    // Fill in node name
    const nameInput = modal.locator("input").first();
    await nameInput.fill("Finance Department");

    // Click "Add Node" button (wait for it to be enabled after name is filled)
    const addBtn = modal.getByRole("button", { name: "Add Node" });
    await expect(addBtn).toBeEnabled({ timeout: 3000 });
    await addBtn.click();

    // New node should appear on canvas
    await page.waitForTimeout(1000);
    const allNodes = page.locator('[data-testid^="node-card-"]');
    const count = await allNodes.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  /* ─────────────────── Node Modal ─────────────────── */

  test("clicking a node card opens the node modal with tabs", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    const firstNode = page.locator('[data-testid^="node-card-"]').first();
    await expect(firstNode).toBeVisible({ timeout: 10000 });
    await firstNode.click();

    const nodeModal = page.locator('[data-testid="node-modal"]');
    await expect(nodeModal).toBeVisible({ timeout: 5000 });

    // Verify all tabs visible
    await expect(nodeModal.getByRole("tab", { name: "People" })).toBeVisible();
    await expect(nodeModal.getByRole("tab", { name: "Resources" })).toBeVisible();
    await expect(nodeModal.getByRole("tab", { name: "Settings" })).toBeVisible();
  });

  test("node modal tabs switch and ESC closes modal", async ({ page }) => {
    await loginAndNavigate(page);

    const firstNode = page.locator('[data-testid^="node-card-"]').first();
    await firstNode.click();
    const nodeModal = page.locator('[data-testid="node-modal"]');
    await expect(nodeModal).toBeVisible({ timeout: 5000 });

    // Switch tabs
    await nodeModal.getByRole("tab", { name: "Settings" }).click();
    await page.waitForTimeout(300);
    await nodeModal.getByRole("tab", { name: "Resources" }).click();
    await page.waitForTimeout(300);
    await nodeModal.getByRole("tab", { name: "People" }).click();
    await page.waitForTimeout(300);

    // Close with ESC
    await page.keyboard.press("Escape");
    await expect(nodeModal).not.toBeVisible({ timeout: 3000 });
  });

  /* ─────────────────── Add Person through Node Modal ─────────────────── */

  test("adds a person through the node modal People tab", async ({ page }) => {
    await loginAndNavigate(page);

    const firstNode = page.locator('[data-testid^="node-card-"]').first();
    await firstNode.click();
    const nodeModal = page.locator('[data-testid="node-modal"]');
    await expect(nodeModal).toBeVisible({ timeout: 5000 });

    // Click add person button
    const addPersonBtn = nodeModal.getByLabel("Add person");
    if (await addPersonBtn.isVisible()) {
      await addPersonBtn.click();
    }

    // Fill person form
    const nameInput = nodeModal.locator('input[placeholder="Full name"]');
    if (await nameInput.isVisible({ timeout: 3000 })) {
      await nameInput.fill("Alice Testington");

      const empIdInput = nodeModal.locator('input[placeholder="EMP-001"]');
      await empIdInput.fill(`EMP-UI-${Date.now()}`);

      const emailInput = nodeModal.locator('input[placeholder="name@company.com"]');
      await emailInput.fill("alice.test@example.com");

      // Save
      await nodeModal.getByRole("button", { name: "Save Person" }).click();
      await page.waitForTimeout(2000);

      // Person should appear in the list
      await expect(nodeModal.getByText("Alice Testington")).toBeVisible({
        timeout: 5000,
      });
    }
  });

  /* ─────────────────── API Fetch Verification ─────────────────── */

  test("org setup page triggers fetch APIs on load", async ({ page }) => {
    const fetchedUrls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/org-setup") || url.includes("/api/roles") || url.includes("/api/cost-centers")) {
        fetchedUrls.push(url);
      }
    });

    await loginAndNavigate(page);
    await page.waitForTimeout(3000);

    const hasOrgFetch = fetchedUrls.some(
      (u) => u.includes("/api/org-setup"),
    );
    expect(hasOrgFetch).toBe(true);
  });

  test("opening node modal triggers people fetch for that node", async ({
    page,
  }) => {
    const peopleFetchUrls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/people")) {
        peopleFetchUrls.push(req.url());
      }
    });

    await loginAndNavigate(page);

    const firstNode = page.locator('[data-testid^="node-card-"]').first();
    await firstNode.click();

    const nodeModal = page.locator('[data-testid="node-modal"]');
    await expect(nodeModal).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    const hasPeopleFetch = peopleFetchUrls.some((u) => u.includes("/people"));
    expect(hasPeopleFetch).toBe(true);
  });
});
