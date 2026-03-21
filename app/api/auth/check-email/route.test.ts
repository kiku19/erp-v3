// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/check-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exists: true when email is registered", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: "t1", email: "taken@acme.com" });
    const res = await makeRequest({ email: "taken@acme.com" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(true);
    expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { email: "taken@acme.com", isDeleted: false },
      select: { id: true },
    });
  });

  it("returns exists: false when email is not registered", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ email: "new@acme.com" });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(false);
  });

  it("returns 400 for invalid email", async () => {
    const res = await makeRequest({ email: "not-valid" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing email", async () => {
    const res = await makeRequest({});
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.tenant.findFirst.mockRejectedValue(new Error("DB error"));
    const res = await makeRequest({ email: "test@acme.com" });
    expect(res.status).toBe(500);
  });
});
