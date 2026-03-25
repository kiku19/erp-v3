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
    create: vi.fn(),
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
