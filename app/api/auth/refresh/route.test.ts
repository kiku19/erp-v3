// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRefreshToken } from "@/lib/auth";

const mockTenant = {
  id: "tenant-123",
  tenantName: "Acme Corp",
  email: "admin@acme.com",
  role: "admin",
  accessTokenExpiryMins: 15,
  refreshTokenExpiryDays: 7,
  rememberMeExpiryDays: 30,
  refreshToken: "",
  refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  accessTokenExpiresAt: null,
  isDeleted: false,
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

async function makeRequest(cookie?: string): Promise<Response> {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return POST(
    new Request("http://localhost:3000/api/auth/refresh", {
      method: "POST",
      headers,
    }),
  );
}

describe("POST /api/auth/refresh", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret-must-be-at-least-32chars");
    vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret-must-be-at-least-32chars");

    const token = await generateRefreshToken("tenant-123", 7);
    mockTenant.refreshToken = token;
    mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant);
    mockPrisma.tenant.update.mockResolvedValue(mockTenant);
  });

  it("returns 200 with new access token for valid refresh cookie", async () => {
    const res = await makeRequest(`refreshToken=${mockTenant.refreshToken}`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBeDefined();
    expect(typeof data.accessToken).toBe("string");
  });

  it("rotates the refresh token in cookie and database", async () => {
    const res = await makeRequest(`refreshToken=${mockTenant.refreshToken}`);

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tenant-123" },
        data: expect.objectContaining({
          refreshToken: expect.any(String),
          refreshTokenExpiresAt: expect.any(Date),
        }),
      }),
    );

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await makeRequest();
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid/tampered refresh token", async () => {
    const res = await makeRequest("refreshToken=invalid.token.data");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token does not match database", async () => {
    const differentToken = await generateRefreshToken("tenant-123", 7);
    mockTenant.refreshToken = "some-other-token";
    const res = await makeRequest(`refreshToken=${differentToken}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired refresh token in database", async () => {
    mockTenant.refreshTokenExpiresAt = new Date(Date.now() - 1000);
    const res = await makeRequest(`refreshToken=${mockTenant.refreshToken}`);
    expect(res.status).toBe(401);
  });
});
