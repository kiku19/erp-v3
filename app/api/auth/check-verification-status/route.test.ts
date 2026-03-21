// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

async function makeRequest(email?: string): Promise<Response> {
  const { GET } = await import("./route");
  const url = email
    ? `http://localhost:3000/api/auth/check-verification-status?email=${encodeURIComponent(email)}`
    : `http://localhost:3000/api/auth/check-verification-status`;
  return GET(new Request(url));
}

describe("GET /api/auth/check-verification-status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email param is missing", async () => {
    const res = await makeRequest();
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await makeRequest("not-an-email");
    expect(res.status).toBe(400);
  });

  it("returns verified: false when tenant not found", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest("john@acme.com");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.verified).toBe(false);
  });

  it("returns verified: false when email not yet verified", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({
      id: "tenant-1",
      emailVerified: false,
    });
    const res = await makeRequest("john@acme.com");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.verified).toBe(false);
    expect(data.tenantId).toBeUndefined();
  });

  it("returns verified: true with tenantId when email is verified", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({
      id: "tenant-abc",
      emailVerified: true,
    });
    const res = await makeRequest("john@acme.com");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.verified).toBe(true);
    expect(data.tenantId).toBe("tenant-abc");
  });

  it("returns 500 on unexpected error", async () => {
    mockPrisma.tenant.findFirst.mockRejectedValue(new Error("DB down"));
    const res = await makeRequest("john@acme.com");
    expect(res.status).toBe(500);
  });
});
