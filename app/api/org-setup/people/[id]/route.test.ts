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
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  oBSNode: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((fns: unknown[]) => Promise.all(fns)),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: vi.fn(),
  OBS_EVENTS: {
    PERSON_CREATED: "obs.person.created",
    PERSON_UPDATED: "obs.person.updated",
    PERSON_DELETED: "obs.person.deleted",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── PATCH /api/org-setup/people/[id] ────────── */

describe("PATCH /api/org-setup/people/[id]", () => {
  it("updates a person successfully", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      name: "Old Name",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.update.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      name: "Updated Name",
      employeeId: "EMP-001",
      email: "updated@example.com",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.person.name).toBe("Updated Name");
  });

  it("returns 400 for validation error", async () => {
    const { PATCH } = await import("./route");

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });

    expect(res.status).toBe(400);
  });

  it("sets nodeId to null (unassign from node)", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      nodeId: "node-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.update.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      nodeId: null,
      name: "Test Person",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ nodeId: null }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.person.nodeId).toBeNull();
  });

  it("validates target node exists when changing nodeId to a non-null value", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      nodeId: null,
      isDeleted: false,
    });
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ nodeId: "nonexistent-node" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Node not found");
  });

  it("returns 404 when person not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/person-999", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-999" }) });

    expect(res.status).toBe(404);
  });
});

/* ─────────────────────── DELETE /api/org-setup/people/[id] ────────── */

describe("DELETE /api/org-setup/people/[id]", () => {
  it("soft-deletes a person and clears node head references", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.update.mockResolvedValue({
      id: "person-1",
      isDeleted: true,
    });
    mockPrisma.oBSNode.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "person-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Person deleted successfully");
    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("returns 404 for non-existent person", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/person-999", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "person-999" }) });

    expect(res.status).toBe(404);
  });
});

/* ── Assign → Remove → Reassign flow ──────────────────────────────── */

describe("Assign → Remove → Reassign flow", () => {
  it("assigns person to node, removes them (nodeId: null), then reassigns", async () => {
    const { PATCH } = await import("./route");

    const basePerson = {
      id: "person-1",
      tenantId: "tenant-1",
      nodeId: null,
      name: "Alice Smith",
      employeeId: "EMP-001",
      isDeleted: false,
    };

    // Step 1: Assign person to node-A
    mockPrisma.oBSPerson.findFirst.mockResolvedValueOnce(basePerson);
    mockPrisma.oBSNode.findFirst.mockResolvedValueOnce({ id: "node-A", tenantId: "tenant-1", isDeleted: false });
    mockPrisma.oBSPerson.update.mockResolvedValueOnce({ ...basePerson, nodeId: "node-A" });

    const assignReq = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ nodeId: "node-A" }),
    });
    const assignRes = await PATCH(assignReq, { params: Promise.resolve({ id: "person-1" }) });
    expect(assignRes.status).toBe(200);
    const assignBody = await assignRes.json();
    expect(assignBody.person.nodeId).toBe("node-A");

    // Verify Prisma was called with node connect (not scalar nodeId)
    expect(mockPrisma.oBSPerson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ node: { connect: { id: "node-A" } } }),
      }),
    );

    // Step 2: Remove person from node (set nodeId to null)
    mockPrisma.oBSPerson.findFirst.mockResolvedValueOnce({ ...basePerson, nodeId: "node-A" });
    mockPrisma.oBSPerson.update.mockResolvedValueOnce({ ...basePerson, nodeId: null });

    const removeReq = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ nodeId: null }),
    });
    const removeRes = await PATCH(removeReq, { params: Promise.resolve({ id: "person-1" }) });
    expect(removeRes.status).toBe(200);
    const removeBody = await removeRes.json();
    expect(removeBody.person.nodeId).toBeNull();

    // Verify Prisma was called with node disconnect (not scalar nodeId: null)
    expect(mockPrisma.oBSPerson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ node: { disconnect: true } }),
      }),
    );

    // Step 3: Reassign person to node-B
    mockPrisma.oBSPerson.findFirst.mockResolvedValueOnce({ ...basePerson, nodeId: null });
    mockPrisma.oBSNode.findFirst.mockResolvedValueOnce({ id: "node-B", tenantId: "tenant-1", isDeleted: false });
    mockPrisma.oBSPerson.update.mockResolvedValueOnce({ ...basePerson, nodeId: "node-B" });

    const reassignReq = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ nodeId: "node-B" }),
    });
    const reassignRes = await PATCH(reassignReq, { params: Promise.resolve({ id: "person-1" }) });
    expect(reassignRes.status).toBe(200);
    const reassignBody = await reassignRes.json();
    expect(reassignBody.person.nodeId).toBe("node-B");
  });
});
