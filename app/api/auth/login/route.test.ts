// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth";

const mockTenant = {
  id: "tenant-123",
  tenantName: "Acme Corp",
  email: "admin@acme.com",
  password: "",
  role: "admin",
  accessTokenExpiryMins: 15,
  refreshTokenExpiryDays: 7,
  rememberMeExpiryDays: 30,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  accessTokenExpiresAt: null,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockTenant.password = await hashPassword("securepass123");
    mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant);
    mockPrisma.tenant.update.mockResolvedValue(mockTenant);
    vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret-must-be-at-least-32chars");
    vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret-must-be-at-least-32chars");
  });

  it("returns 200 with access token for valid credentials", async () => {
    const res = await makeRequest({
      email: "admin@acme.com",
      password: "securepass123",
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBeDefined();
    expect(data.tenant.id).toBe("tenant-123");
    expect(data.tenant.email).toBe("admin@acme.com");
    expect(data.tenant.tenantName).toBe("Acme Corp");
    expect(data.tenant.role).toBe("admin");
    expect(data.tenant).not.toHaveProperty("password");
  });

  it("sets httpOnly refresh token cookie", async () => {
    const res = await makeRequest({
      email: "admin@acme.com",
      password: "securepass123",
    });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
    expect(setCookie!.toLowerCase()).toContain("samesite=strict");
  });

  it("stores refresh token and expiry in database", async () => {
    await makeRequest({
      email: "admin@acme.com",
      password: "securepass123",
    });

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tenant-123" },
        data: expect.objectContaining({
          refreshToken: expect.any(String),
          refreshTokenExpiresAt: expect.any(Date),
          accessTokenExpiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns 400 for invalid email format", async () => {
    const res = await makeRequest({
      email: "not-an-email",
      password: "securepass123",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errors).toBeDefined();
  });

  it("returns 400 for short password", async () => {
    const res = await makeRequest({
      email: "admin@acme.com",
      password: "short",
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for non-existent email", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest({
      email: "unknown@acme.com",
      password: "securepass123",
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("Invalid email or password");
  });

  it("returns 401 for wrong password", async () => {
    const res = await makeRequest({
      email: "admin@acme.com",
      password: "wrongpassword123",
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("Invalid email or password");
  });

  it("returns 401 for soft-deleted tenant", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest({
      email: "admin@acme.com",
      password: "securepass123",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing body", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });
});
