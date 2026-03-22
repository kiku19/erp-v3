// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
  },
  emailVerificationToken: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.tenant.findFirst.mockResolvedValue({
      id: "t-1",
      email: "john@acme.com",
      emailVerified: false,
    });
    mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({
      id: "evt-2",
      token: "new-token",
    });
  });

  it("returns 200 and sends new verification email", async () => {
    const res = await makeRequest({ email: "john@acme.com" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBeDefined();
  });

  it("soft-deletes existing unused tokens", async () => {
    await makeRequest({ email: "john@acme.com" });
    expect(mockPrisma.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: "t-1",
        usedAt: null,
        isDeleted: false,
      },
      data: { isDeleted: true },
    });
  });

  it("creates a new verification token", async () => {
    await makeRequest({ email: "john@acme.com" });
    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t-1",
        email: "john@acme.com",
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("returns 400 when tenant not found", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ email: "unknown@acme.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when already verified", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ email: "verified@acme.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await makeRequest({ email: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.tenant.findFirst.mockRejectedValue(new Error("DB error"));
    const res = await makeRequest({ email: "john@acme.com" });
    expect(res.status).toBe(500);
  });
});
