import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Roles CRUD flow.
 * Tests the full API lifecycle: create, read, update, soft-delete,
 * ensuring tenantId isolation and metadata are stored correctly.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe.serial("Roles API E2E", () => {
  let token: string;
  let tenantId: string;
  let createdRoleId: string;

  const testEmail = `roles-e2e-${Date.now()}@test.com`;
  const testPassword = "TestPass123!";

  test("setup: signup, verify email, and login", async ({ request }) => {
    // 1. Signup
    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        fullName: "Roles E2E Tester",
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    expect(signupRes.status()).toBe(201);

    // 2. Force-verify email (test-only helper)
    const verifyRes = await request.post(
      `${BASE_URL}/api/test-helpers/verify-email`,
      { data: { email: testEmail } },
    );
    expect(verifyRes.status()).toBe(200);
    const verifyBody = await verifyRes.json();
    tenantId = verifyBody.tenantId;

    // 3. Login
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: testEmail, password: testPassword },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    token = loginBody.accessToken;
    tenantId = loginBody.tenant.id;

    expect(token).toBeTruthy();
    expect(tenantId).toBeTruthy();
  });

  test("POST /api/roles — creates a role with tenantId and metadata", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Senior Painter",
        level: "Senior",
        defaultPayType: "hourly",
        overtimeEligible: true,
        skillTags: ["Painting", "Surface prep"],
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    expect(body.role).toBeDefined();
    expect(body.role.name).toBe("Senior Painter");
    expect(body.role.code).toBeTruthy();
    expect(body.role.tenantId).toBe(tenantId);
    expect(body.role.level).toBe("Senior");
    expect(body.role.defaultPayType).toBe("hourly");
    expect(body.role.overtimeEligible).toBe(true);
    expect(body.role.skillTags).toEqual(["Painting", "Surface prep"]);
    expect(body.role.isDeleted).toBe(false);
    expect(body.role.createdAt).toBeTruthy();
    expect(body.role.updatedAt).toBeTruthy();

    createdRoleId = body.role.id;
  });

  test("GET /api/roles — lists roles with tenantId filter", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.roles).toBeDefined();
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.roles.length).toBeGreaterThanOrEqual(1);

    const found = body.roles.find(
      (r: { id: string }) => r.id === createdRoleId,
    );
    expect(found).toBeDefined();
    expect(found.name).toBe("Senior Painter");
    expect(found.tenantId).toBe(tenantId);
  });

  test("GET /api/roles?q=paint — search filter works", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/roles?q=paint`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.roles.length).toBeGreaterThanOrEqual(1);
    expect(
      body.roles.some((r: { name: string }) =>
        r.name.toLowerCase().includes("paint"),
      ),
    ).toBe(true);
  });

  test("PATCH /api/roles/:id — updates role", async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/roles/${createdRoleId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Lead Painter",
        level: "Lead",
        skillTags: ["Painting", "Surface prep", "Supervision"],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.role.name).toBe("Lead Painter");
    expect(body.role.level).toBe("Lead");
    expect(body.role.skillTags).toContain("Supervision");
    expect(body.role.tenantId).toBe(tenantId);
  });

  test("DELETE /api/roles/:id — soft deletes role", async ({ request }) => {
    const res = await request.delete(
      `${BASE_URL}/api/roles/${createdRoleId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Role deleted successfully");

    // Verify it no longer appears in listing (soft-deleted, filtered out)
    const listRes = await request.get(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    const found = listBody.roles.find(
      (r: { id: string }) => r.id === createdRoleId,
    );
    expect(found).toBeUndefined();
  });

  test("POST /api/roles — 400 for invalid input", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "A" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/roles — 401 without auth token", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/roles`);
    expect(res.status()).toBe(401);
  });
});
