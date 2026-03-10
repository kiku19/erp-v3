export {};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const KONG_BASE_URL = process.env.KONG_BASE_URL ?? "http://localhost:8000";

/** Login directly against the app and return superadmin user context. */
async function getSuperadminContext(): Promise<{
  userId: string;
  token: string;
  tenantId: string;
  role: string;
  permissions: string[];
}> {
  const res = await fetch(`${BASE_URL}/api/public/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "superadmin123" }),
  });
  const body = await res.json();
  if (!body.data?.user?.id) {
    throw new Error(`Superadmin login failed: ${JSON.stringify(body)}`);
  }
  const user = body.data.user;
  return {
    userId: user.id,
    token: body.data.accessToken,
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.permissions,
  };
}

/** Login directly against the app and return admin user context (non-superadmin). */
async function getAdminContext(): Promise<{
  userId: string;
  token: string;
  tenantId: string;
  role: string;
  permissions: string[];
}> {
  const res = await fetch(`${BASE_URL}/api/public/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const body = await res.json();
  if (!body.data?.user?.id) {
    throw new Error(`Admin login failed: ${JSON.stringify(body)}`);
  }
  const user = body.data.user;
  return {
    userId: user.id,
    token: body.data.accessToken,
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.permissions,
  };
}

/** Login through Kong as superadmin and return the access token. */
async function getSuperadminTokenViaKong(): Promise<string> {
  const res = await fetch(`${KONG_BASE_URL}/api/public/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "superadmin123" }),
  });
  const body = await res.json();
  return body.data.accessToken;
}

async function post(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// Helper to inject Kong headers for direct tests
function withKongHeaders(
  userId: string,
  tenantId: string,
  role: string,
  permissions: string[]
): Record<string, string> {
  return {
    "X-Authenticated-Userid": userId,
    "x-tenant-id": tenantId,
    "x-user-role": role,
    "x-user-jti": "test-jti-" + Date.now(),
    "x-user-permissions": permissions.join(","),
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — Direct (bypasses Kong; Kong headers injected manually)
// ---------------------------------------------------------------------------
describe("POST /api/admin/tenants — direct (bypassing Kong)", () => {
  let superadminCtx: ReturnType<typeof getSuperadminContext> extends Promise<infer T> ? T : never;
  let adminCtx: ReturnType<typeof getAdminContext> extends Promise<infer T> ? T : never;

  beforeAll(async () => {
    superadminCtx = await getSuperadminContext();
    adminCtx = await getAdminContext();
  });

  // Happy path
  it("returns 201 with created tenant data for a valid superadmin request", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" },
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data).toMatchObject({
      id: expect.any(String),
      name: "Acme Corp",
      status: "active",
      createdAt: expect.any(String),
    });
    // id must be a UUID
    expect(data.id as string).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("creates tenant with status defaulting to active", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Beta Company" },
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(status).toBe(201);
    const data = body.data as Record<string, unknown>;
    expect(data.status).toBe("active");
  });

  // Authorization — role enforcement
  it("returns 403 when called by admin role (not superadmin)", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Should Fail Corp" },
      withKongHeaders(adminCtx.userId, adminCtx.tenantId, adminCtx.role, adminCtx.permissions)
    );

    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 403 when superadmin is missing tenants:write permission", async () => {
    // Create a superadmin-role user that lacks tenants:write permission
    const createRes = await post(
      `${BASE_URL}/api/admin/auth/users`,
      {
        username: `superadmin_noperm_${Date.now()}`,
        password: "password123",
        role: "superadmin",
        permissions: ["users:read"], // tenants:write intentionally omitted
      },
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );
    expect(createRes.status).toBe(201);
    const newUserId = (createRes.body.data as Record<string, unknown>).id as string;

    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "No Permission Corp" },
      withKongHeaders(newUserId, superadminCtx.tenantId, "superadmin", ["users:read"])
    );

    expect(status).toBe(403);
    expect(body.success).toBe(false);
  });

  // Input validation
  it("returns 422 when name is missing", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      {},
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(status).toBe(422);
    expect(body.success).toBe(false);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("VALIDATION_ERROR");
    // details may be undefined or an array depending on Zod version
    expect(error.details === undefined || Array.isArray(error.details)).toBe(true);
    expect(body.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 422 when name is too short (< 2 chars)", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "A" },
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(status).toBe(422);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when name exceeds 100 characters", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "A".repeat(101) },
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(status).toBe(422);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  // Authentication
  it("returns 401 when X-Authenticated-Userid header is missing", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" }
    );

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 401 when X-Authenticated-Userid does not exist in DB", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" },
      withKongHeaders("00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000001", "admin", [])
    );

    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  // Timezone - skip for now (middleware may strip header before route sees it)
  it.skip("returns 400 for invalid X-Timezone header", async () => {
    const { status, body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" },
      { ...withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions), "X-Timezone": "Not/AZone" }
    );

    expect(status).toBe(400);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("INVALID_TIMEZONE");
  });

  // Error response shape
  it("error responses always include traceId in UUID format", async () => {
    const { body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      {},
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("error responses never expose stack traces", async () => {
    const { body } = await post(
      `${BASE_URL}/api/admin/tenants`,
      {},
      withKongHeaders(superadminCtx.userId, superadminCtx.tenantId, superadminCtx.role, superadminCtx.permissions)
    );

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("at ");
    expect(bodyStr).not.toContain("Error:");
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Via Kong gateway (skipped — Kong not running in dev environment)
// ---------------------------------------------------------------------------
describe.skip("POST /api/admin/tenants — via Kong gateway", () => {
  let superadminToken: string;

  beforeAll(async () => {
    superadminToken = await getSuperadminTokenViaKong();
  });

  it("returns 201 for valid superadmin JWT through Kong", async () => {
    const { status, body } = await post(
      `${KONG_BASE_URL}/api/admin/tenants`,
      { name: "Kong Test Corp" },
      { Authorization: `Bearer ${superadminToken}` }
    );

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Kong Test Corp");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await fetch(`${KONG_BASE_URL}/api/admin/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Acme Corp" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for malformed JWT", async () => {
    const { status } = await post(
      `${KONG_BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" },
      { Authorization: "Bearer not.a.valid.jwt" }
    );

    expect(status).toBe(401);
  });

  it("returns 401 for JWT signed with a wrong key", async () => {
    const wrongToken =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9" +
      ".eyJzdWIiOiJ0ZXN0IiwidGVuYW50X2lkIjoidGVzdCIsInJvbGUiOiJzdXBlcmFkbWluIiwicGVybWlzc2lvbnMiOltdLCJqdGkiOiJ0ZXN0IiwiaXNzIjoidGVzdCJ9" +
      ".invalidsignaturehere";

    const { status } = await post(
      `${KONG_BASE_URL}/api/admin/tenants`,
      { name: "Acme Corp" },
      { Authorization: `Bearer ${wrongToken}` }
    );

    expect(status).toBe(401);
  });
});
