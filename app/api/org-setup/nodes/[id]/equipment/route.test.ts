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
  oBSEquipment: { findMany: vi.fn(), count: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/org-setup/nodes/[id]/equipment", () => {
  it("returns paginated equipment for a node (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([
      { id: "e1", name: "Excavator", nodeId: "node-1" },
      { id: "e2", name: "Crane", nodeId: "node-1" },
    ]);
    mockPrisma.oBSEquipment.count.mockResolvedValue(2);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/equipment?limit=20&offset=0",
      { headers: { authorization: "Bearer valid-token" } },
    );
    const res = await GET(req, makeCtx("node-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.equipment).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("respects limit and offset query params", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.count.mockResolvedValue(50);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/equipment?limit=10&offset=20",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });

  it("defaults to limit=20 offset=0", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/equipment",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    );
  });

  it("returns 404 for non-existent node", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/bad-id/equipment",
      { headers: { authorization: "Bearer valid-token" } },
    );
    const res = await GET(req, makeCtx("bad-id"));

    expect(res.status).toBe(404);
  });

  it("filters by tenantId and isDeleted", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-1/equipment",
      { headers: { authorization: "Bearer valid-token" } },
    );
    await GET(req, makeCtx("node-1"));

    expect(mockPrisma.oBSEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", nodeId: "node-1", isDeleted: false },
      }),
    );
  });
});
