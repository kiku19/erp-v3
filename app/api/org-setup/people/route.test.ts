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
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  oBSNode: {
    findFirst: vi.fn(),
  },
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

/* ─────────────────────── POST /api/org-setup/people ───────────────── */

describe("POST /api/org-setup/people", () => {
  const validBody = {
    nodeId: "node-1",
    name: "John Doe",
    employeeId: "EMP-001",
    email: "john@example.com",
  };

  it("creates a person successfully (201)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);
    mockPrisma.oBSPerson.create.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      ...validBody,
      roleId: null,
      payType: "hourly",
      standardRate: null,
      overtimeRate: null,
      overtimePay: false,
      monthlySalary: null,
      dailyAllocation: null,
      contractAmount: null,
      employmentType: "full-time",
      joinDate: null,
      photoUrl: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.person.name).toBe("John Doe");
    expect(mockPrisma.oBSPerson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          name: "John Doe",
          employeeId: "EMP-001",
        }),
      }),
    );
  });

  it("creates a person without nodeId (floating person) (201)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);
    mockPrisma.oBSPerson.create.mockResolvedValue({
      id: "person-2",
      tenantId: "tenant-1",
      nodeId: null,
      name: "Floating Person",
      employeeId: "EMP-002",
      email: "floating@example.com",
      roleId: null,
      payType: "hourly",
      standardRate: null,
      overtimeRate: null,
      overtimePay: false,
      monthlySalary: null,
      dailyAllocation: null,
      contractAmount: null,
      employmentType: "full-time",
      joinDate: null,
      photoUrl: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Floating Person",
        employeeId: "EMP-002",
        email: "floating@example.com",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.person.nodeId).toBeNull();
    expect(mockPrisma.oBSNode.findFirst).not.toHaveBeenCalled();
  });

  it("creates a person with nodeId and validates node exists (201)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);
    mockPrisma.oBSPerson.create.mockResolvedValue({
      id: "person-3",
      tenantId: "tenant-1",
      nodeId: "node-1",
      name: "Assigned Person",
      employeeId: "EMP-003",
      email: "assigned@example.com",
      roleId: null,
      payType: "hourly",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nodeId: "node-1",
        name: "Assigned Person",
        employeeId: "EMP-003",
        email: "assigned@example.com",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrisma.oBSNode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "node-1", tenantId: "tenant-1", isDeleted: false },
      }),
    );
  });

  it("returns 400 for validation error", async () => {
    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "John" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when node not found", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Node not found");
  });

  it("returns 409 for duplicate employeeId", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({
      id: "node-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "existing-person",
      employeeId: "EMP-001",
    });

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});

/* ─────────────────────── GET /api/org-setup/people ─────────────────── */

describe("GET /api/org-setup/people", () => {
  it("returns all non-deleted people for the tenant (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: "node-1", node: { id: "node-1", name: "Engineering" } },
      { id: "p2", tenantId: "tenant-1", name: "Bob", nodeId: null, node: null },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/org-setup/people", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.people).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("filters by search query on name and employeeId (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p1", tenantId: "tenant-1", name: "Alice", employeeId: "EMP-001", nodeId: null, node: null },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/org-setup/people?search=alice", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.people).toHaveLength(1);
    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ name: expect.objectContaining({ contains: "alice" }) }),
                expect.objectContaining({ employeeId: expect.objectContaining({ contains: "alice" }) }),
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it("excludes people from a specific node via excludeNodeId (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p2", tenantId: "tenant-1", name: "Bob", nodeId: "node-2", node: { id: "node-2", name: "Operations" } },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/org-setup/people?excludeNodeId=node-1", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                { nodeId: null },
                { NOT: { nodeId: "node-1" } },
              ],
            }),
          ]),
        }),
      }),
    );
  });

  it("returns only people belonging to a specific node via nodeId filter (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p1", tenantId: "tenant-1", name: "Alice", nodeId: "node-1", node: { id: "node-1", name: "Engineering" } },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/org-setup/people?nodeId=node-1", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.people).toHaveLength(1);
    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nodeId: "node-1",
        }),
      }),
    );
  });

  it("people assigned to node-1 do NOT appear when excludeNodeId=node-1 (200)", async () => {
    const { GET } = await import("./route");
    // Simulate: DB returns only people NOT in node-1
    mockPrisma.oBSPerson.findMany.mockResolvedValue([
      { id: "p2", tenantId: "tenant-1", name: "Bob", nodeId: null, node: null },
      { id: "p3", tenantId: "tenant-1", name: "Charlie", nodeId: "node-2", node: { id: "node-2", name: "Ops" } },
    ]);
    mockPrisma.oBSPerson.count.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/org-setup/people?excludeNodeId=node-1", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // None of the returned people should be in node-1
    for (const person of body.people) {
      expect(person.nodeId).not.toBe("node-1");
    }
  });

  it("supports pagination with limit and offset (200)", async () => {
    const { GET } = await import("./route");
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.count.mockResolvedValue(50);

    const req = new NextRequest("http://localhost/api/org-setup/people?limit=10&offset=20", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.oBSPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      }),
    );
  });
});
