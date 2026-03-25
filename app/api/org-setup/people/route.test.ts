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
