// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  projectLayout: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

const paramsPromise = Promise.resolve({ id: "layout-1" });

async function makeDeleteRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/layouts/layout-1/delete", { method: "POST" }) as never,
    { params: paramsPromise },
  );
}

describe("POST /api/planner/layouts/:id/delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeDeleteRequest(false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue(null);
    const res = await makeDeleteRequest();
    expect(res.status).toBe(404);
  });

  it("soft deletes and returns 200", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue({ id: "layout-1" });
    mockPrisma.projectLayout.update.mockResolvedValue({});
    const res = await makeDeleteRequest();
    expect(res.status).toBe(200);
    expect(mockPrisma.projectLayout.update).toHaveBeenCalledWith({
      where: { id: "layout-1" },
      data: { isDeleted: true },
    });
  });
});
