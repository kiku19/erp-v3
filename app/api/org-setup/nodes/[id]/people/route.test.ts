// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    email: "test@test.com",
    role: "admin",
  }),
  isAuthError: vi.fn((val: unknown) => val instanceof Response),
}));

const mockPrisma = {
  oBSNode: { findFirst: vi.fn() },
  oBSPerson: { findMany: vi.fn(), count: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/org-setup/nodes/[id]/people", () => {
  it("returns paginated people for a node (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p1", name: "Alice", employeeId: "EMP-001", nodeId: "node-1" },
      { id: "p2", name: "Bob", employeeId: "EMP-002", nodeId: "node-1" },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(2);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/people?limit=20&offset=0",
      { headers: { authorization: "Bearer valid-token" } },
    );
    const res = await GET(req, makeCtx("node-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.people).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("respects limit and offset query params", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.count.mockResolvedValue(50);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/people?limit=10&offset=20",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });

  it("defaults to limit=20 offset=0", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/people",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    );
  });

  it("returns 404 for non-existent node", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/bad-id/people",
      { headers: { authorization: "Bearer valid-token" } },
    );
    const res = await GET(req, makeCtx("bad-id"));

    expect(res.status).toBe(404);
  });

  it("filters by tenantId and isDeleted", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/people",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", nodeId: "node-1", isDeleted: false },
      }),
    );
  });
});
