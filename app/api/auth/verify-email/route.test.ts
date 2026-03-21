// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  emailVerificationToken: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  tenant: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const validToken = {
  id: "evt-1",
  tenantId: "t-1",
  token: "valid-token-uuid",
  email: "john@acme.com",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: null,
  isDeleted: false,
};

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.emailVerificationToken.findFirst.mockResolvedValue(validToken);
    mockPrisma.emailVerificationToken.update.mockResolvedValue({});
    mockPrisma.tenant.update.mockResolvedValue({});
  });

  it("returns 200 for valid token", async () => {
    const res = await makeRequest({ token: "valid-token-uuid" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBeDefined();
  });

  it("marks tenant as email verified", async () => {
    await makeRequest({ token: "valid-token-uuid" });
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "t-1" },
      data: { emailVerified: true },
    });
  });

  it("marks token as used", async () => {
    await makeRequest({ token: "valid-token-uuid" });
    expect(mockPrisma.emailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("returns 400 for expired token", async () => {
    mockPrisma.emailVerificationToken.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ token: "expired-token" });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("Invalid or expired");
  });

  it("returns 400 for already-used token", async () => {
    mockPrisma.emailVerificationToken.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ token: "used-token" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing token", async () => {
    const res = await makeRequest({});
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.emailVerificationToken.findFirst.mockRejectedValue(
      new Error("DB error"),
    );
    const res = await makeRequest({ token: "some-token" });
    expect(res.status).toBe(500);
  });
});
