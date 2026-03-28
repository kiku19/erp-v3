// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ─────────────────────── Mocks ───────────────────────────────────── */

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
  oBSNode: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  oBSPerson: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  calendar: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  costCenter: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockEmitOBSEvent = vi.fn();

vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: mockEmitOBSEvent,
  OBS_EVENTS: {
    NODE_CREATED: "obs.node.created",
    NODE_UPDATED: "obs.node.updated",
    NODE_DELETED: "obs.node.deleted",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── POST /api/org-setup/nodes ──────────────── */

describe("POST /api/org-setup/nodes", () => {
  it("creates a node successfully (201)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);
    const createdNode = {
      id: "node-1",
      tenantId: "tenant-1",
      name: "Engineering",
      code: "ENG",
      type: "DEPARTMENT",
      parentId: null,
      nodeHeadPersonId: null,
      calendarId: null,
      assignedRoles: [],
      sortOrder: 0,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.oBSNode.create.mockResolvedValue(createdNode);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Engineering",
        code: "ENG",
        type: "DEPARTMENT",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.node.name).toBe("Engineering");
    expect(mockPrisma.oBSNode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          name: "Engineering",
          code: "ENG",
          type: "DEPARTMENT",
        }),
      }),
    );
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.node.created",
      "tenant-1",
      "node-1",
      { node: createdNode },
    );
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Validation failed");
  });

  it("returns 409 for duplicate code", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Engineering",
        code: "ENG",
        type: "DEPARTMENT",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toContain("ENG");
  });
});

/* ─────────────────────── GET /api/org-setup/nodes ──────────────── */

describe("GET /api/org-setup/nodes", () => {
  it("returns nodes with computed counts (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findMany.mockResolvedValue([
      {
        id: "node-1",
        tenantId: "tenant-1",
        parentId: null,
        name: "HQ",
        code: "HQ",
        type: "COMPANY_ROOT",
        nodeHeadPersonId: "person-1",
        calendarId: "cal-1",
        costCenterId: "cc-1",
        assignedRoles: [],
        isActive: true,
        sortOrder: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { people: 3, equipment: 2, materials: 5 },
      },
    ]);
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "person-1", name: "John Smith" },
    ]);
    mockPrisma.calendar.findMany.mockResolvedValue([
      { id: "cal-1", name: "Default Calendar" },
    ]);
    mockPrisma.costCenter.findMany.mockResolvedValue([
      { id: "cc-1", name: "Admin", code: "ADM" },
    ]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0]).toMatchObject({
      id: "node-1",
      name: "HQ",
      code: "HQ",
      peopleCount: 3,
      equipmentCount: 2,
      materialCount: 5,
      nodeHeadName: "John Smith",
      calendarName: "Default Calendar",
      costCenterName: "Admin",
    });
  });

  it("returns empty array for tenant with no nodes", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes).toEqual([]);
  });

  it("queries with tenant isolation and soft-delete filter", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      headers: { authorization: "Bearer valid-token" },
    });
    await GET(req);

    expect(mockPrisma.oBSNode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", isDeleted: false },
      }),
    );
  });

  it("includes _count for people, equipment, materials (excluding soft-deleted)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      headers: { authorization: "Bearer valid-token" },
    });
    await GET(req);

    expect(mockPrisma.oBSNode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: {
              people: { where: { isDeleted: false } },
              equipment: { where: { isDeleted: false } },
              materials: { where: { isDeleted: false } },
            },
          },
        }),
      }),
    );
  });

  it("handles null nodeHead, calendar, costCenter gracefully", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSNode.findMany.mockResolvedValue([
      {
        id: "node-2",
        tenantId: "tenant-1",
        parentId: null,
        name: "Empty Node",
        code: "EMPTY",
        type: "DIVISION",
        nodeHeadPersonId: null,
        calendarId: null,
        costCenterId: null,
        assignedRoles: [],
        isActive: true,
        sortOrder: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { people: 0, equipment: 0, materials: 0 },
      },
    ]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes[0]).toMatchObject({
      id: "node-2",
      peopleCount: 0,
      equipmentCount: 0,
      materialCount: 0,
      nodeHeadName: null,
      calendarName: null,
      costCenterName: null,
    });
  });
});
