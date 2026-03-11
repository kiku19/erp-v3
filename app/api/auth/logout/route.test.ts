// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRefreshToken } from "@/lib/auth";

const mockPrisma = {
  tenant: {
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
    new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers,
    }),
  );
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret-must-be-at-least-32chars");
    vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret-must-be-at-least-32chars");
    mockPrisma.tenant.update.mockResolvedValue({});
  });

  it("returns 200 and clears the refresh cookie", async () => {
    const token = await generateRefreshToken("tenant-123");
    const res = await makeRequest(`refreshToken=${token}`);

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("clears refresh token in the database", async () => {
    const token = await generateRefreshToken("tenant-123");
    await makeRequest(`refreshToken=${token}`);

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-123" },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
        accessTokenExpiresAt: null,
      },
    });
  });

  it("returns 200 even without a cookie (idempotent)", async () => {
    const res = await makeRequest();
    expect(res.status).toBe(200);
  });
});
