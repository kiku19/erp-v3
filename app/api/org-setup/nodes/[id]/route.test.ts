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
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  oBSPerson: {
    updateMany: vi.fn(),
  },
  oBSEquipment: {
    updateMany: vi.fn(),
  },
  oBSMaterial: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
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

/* ─────────────────────── PATCH /api/org-setup/nodes/[id] ────────── */

describe("PATCH /api/org-setup/nodes/[id]", () => {
  it("updates a node successfully", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-1",
      tenantId: "tenant-1",
      name: "Old Name",
      code: "OLD",
      isDeleted: false,
    });
    const updatedNode = {
      id: "node-1",
      tenantId: "tenant-1",
      name: "Updated Engineering",
      code: "OLD",
      type: "DEPARTMENT",
      parentId: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.oBSNode.update.mockResolvedValue(updatedNode);

    const req = new NextRequest("http://localhost/api/org-setup/nodes/node-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Engineering" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "node-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.node.name).toBe("Updated Engineering");
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.node.updated",
      "tenant-1",
      "node-1",
      { node: updatedNode, changes: { name: "Updated Engineering" } },
    );
  });

  it("returns 400 for invalid input", async () => {
    const { PATCH } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/nodes/node-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "node-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when node not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-999",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Test" }),
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "node-999" }),
    });

    expect(res.status).toBe(404);
  });
});

/* ─────────────────────── DELETE /api/org-setup/nodes/[id] ────────── */

describe("DELETE /api/org-setup/nodes/[id]", () => {
  it("soft-deletes a node with cascade", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    // First call: children of node-1
    // Second call: children of child-1 (grandchildren)
    // Third call: children of child-2
    mockPrisma.oBSNode.findMany
      .mockResolvedValueOnce([{ id: "child-1" }, { id: "child-2" }])
      .mockResolvedValueOnce([]) // child-1 has no children
      .mockResolvedValueOnce([]); // child-2 has no children
    mockPrisma.$transaction.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup/nodes/node-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "node-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Node deleted successfully");
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.node.deleted",
      "tenant-1",
      "node-1",
      {
        nodeId: "node-1",
        cascadedIds: ["node-1", "child-1", "child-2"],
      },
    );
  });

  it("returns 404 for non-existent node", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/nodes/node-999",
      {
        method: "DELETE",
        headers: { authorization: "Bearer valid-token" },
      },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "node-999" }),
    });

    expect(res.status).toBe(404);
  });
});
