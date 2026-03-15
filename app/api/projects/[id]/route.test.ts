// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = {
  tenantId: "tenant-123",
  userId: "user-456",
  email: "admin@acme.com",
  role: "admin",
};

const mockEps = {
  id: "eps-1",
  name: "Energy Division",
  tenantId: "tenant-123",
};

const mockProject = {
  id: "prj-001",
  tenantId: "tenant-123",
  epsId: "eps-1",
  nodeId: null,
  projectId: "PRJ-2024-0001",
  name: "Horizon LNG Terminal",
  status: "Active",
  percentDone: 38,
  startDate: new Date("2024-01-01"),
  finishDate: new Date("2025-06-30"),
  responsibleManager: "John Doe",
  budget: 0,
  actualCost: 0,
  eac: 0,
  sortOrder: 0,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  eps: mockEps,
  node: null,
};

const mockProjectWithNode = {
  ...mockProject,
  nodeId: "node-leaf",
  node: { id: "node-leaf", name: "Oil & Gas Projects", parentNodeId: "node-parent", tenantId: "tenant-123", isDeleted: false },
};

const mockPrisma = {
  project: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  node: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

async function makeGetRequest(id: string, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  if (authenticated) {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuth);
  } else {
    vi.mocked(authenticateRequest).mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    );
  }

  const { GET } = await import("./route");
  return GET(
    new Request(`http://localhost:3000/api/projects/${id}`, {
      headers: { Authorization: "Bearer valid-token" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/projects/{id}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await makeGetRequest("prj-001", false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    const res = await makeGetRequest("nonexistent");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Project not found");
  });

  it("returns 200 with project data and breadcrumb (no node)", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(mockProject);
    const res = await makeGetRequest("prj-001");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("prj-001");
    expect(body.projectId).toBe("PRJ-2024-0001");
    expect(body.name).toBe("Horizon LNG Terminal");
    expect(body.status).toBe("Active");
    expect(body.percentDone).toBe(38);
    expect(body.breadcrumb).toEqual(["Energy Division"]);
  });

  it("returns 200 with full breadcrumb (project → node → parent → EPS)", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(mockProjectWithNode);
    // Leaf node lookup (Oil & Gas Projects → parent node)
    mockPrisma.node.findFirst
      .mockResolvedValueOnce({
        id: "node-leaf",
        name: "Oil & Gas Projects",
        parentNodeId: "node-parent",
        tenantId: "tenant-123",
        isDeleted: false,
      })
      // Parent node lookup (parent → null)
      .mockResolvedValueOnce({
        id: "node-parent",
        name: "Upstream",
        parentNodeId: null,
        tenantId: "tenant-123",
        isDeleted: false,
      });

    const res = await makeGetRequest("prj-001");
    expect(res.status).toBe(200);
    const body = await res.json();
    // Breadcrumb should be [EPS, root node, ..., leaf node]
    expect(body.breadcrumb).toEqual(["Energy Division", "Upstream", "Oil & Gas Projects"]);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.project.findFirst.mockRejectedValue(new Error("DB error"));
    const res = await makeGetRequest("prj-001");
    expect(res.status).toBe(500);
  });
});
