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
  oBSPerson: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  oBSNode: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn((fn: Function) => fn(mockPrisma)),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: vi.fn(),
  OBS_EVENTS: {
    PERSON_UPDATED: "obs.person.updated",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────── POST /api/org-setup/people/batch-assign ────── */

describe("POST /api/org-setup/people/batch-assign", () => {
  it("assigns multiple people to a node (200)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-target",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.findMany
      // First call: validate person IDs exist
      .mockResolvedValueOnce([
        { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: null },
        { id: "p2", tenantId: "tenant-1", name: "Bob", nodeId: "node-other" },
      ])
      // Second call: return updated people
      .mockResolvedValueOnce([
        { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: "node-target" },
        { id: "p2", tenantId: "tenant-1", name: "Bob", nodeId: "node-target" },
      ]);
    mockPrisma.oBSPerson.updateMany.mockResolvedValue({ count: 2 });

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: ["p1", "p2"],
        targetNodeId: "node-target",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(2);
  });

  it("returns 400 when personIds is empty", async () => {
    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: [],
        targetNodeId: "node-1",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when target node not found", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: ["p1"],
        targetNodeId: "nonexistent-node",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Target node not found");
  });

  it("returns 400 when some person IDs are invalid", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-target",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    // Only 1 of 2 persons found
    mockPrisma.oBSPerson.findMany.mockResolvedValueOnce([
      { id: "p1", tenantId: "tenant-1", name: "Alice" },
    ]);

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: ["p1", "p-invalid"],
        targetNodeId: "node-target",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("not found");
  });

  it("returns 400 for missing targetNodeId", async () => {
    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: ["p1"],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("assigned people have their nodeId updated to target node", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-target",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.findMany
      .mockResolvedValueOnce([
        { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: null },
      ])
      .mockResolvedValueOnce([
        { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: "node-target" },
      ]);
    mockPrisma.oBSPerson.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/org-setup/people/batch-assign", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personIds: ["p1"],
        targetNodeId: "node-target",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.people[0].nodeId).toBe("node-target");
  });
});
