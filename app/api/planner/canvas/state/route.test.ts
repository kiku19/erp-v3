// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };
const mockEps = { id: "eps-1", name: "Energy", tenantId: "t-1" };
const mockProject = {
  id: "prj-1",
  tenantId: "t-1",
  epsId: "eps-1",
  nodeId: null,
  projectId: "PRJ-2024-0001",
  name: "Horizon LNG",
  status: "Active",
  percentDone: 38,
  startDate: new Date("2024-01-01"),
  finishDate: null,
  eps: mockEps,
  node: null,
};

const mockPrisma = {
  project: { findFirst: vi.fn() },
  node: { findFirst: vi.fn() },
  plannerSnapshot: { findUnique: vi.fn() },
  calendar: { findMany: vi.fn().mockResolvedValue([]) },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));
vi.mock("@/lib/planner/build-planner-state", () => ({
  buildPlannerState: vi.fn().mockResolvedValue({ wbsNodes: [], activities: [], relationships: [] }),
}));

async function makeRequest(projectId?: string, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { GET } = await import("./route");
  const url = projectId
    ? `http://localhost:3000/api/planner/canvas/state?projectId=${projectId}`
    : "http://localhost:3000/api/planner/canvas/state";
  return GET(new Request(url, { headers: { Authorization: "Bearer t" } }) as never);
}

describe("GET /api/planner/canvas/state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeRequest("prj-1", false);
    expect(res.status).toBe(401);
  });

  it("returns 400 without projectId param", async () => {
    const res = await makeRequest(undefined);
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    const res = await makeRequest("prj-999");
    expect(res.status).toBe(404);
  });

  it("returns 200 with project data and version 0 (no snapshot)", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(mockProject);
    mockPrisma.plannerSnapshot.findUnique.mockResolvedValue(null);
    const res = await makeRequest("prj-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.name).toBe("Horizon LNG");
    expect(body.project.breadcrumb).toEqual(["Energy"]);
    expect(body.version).toBe(0);
  });

  it("returns correct version when snapshot exists", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(mockProject);
    mockPrisma.plannerSnapshot.findUnique.mockResolvedValue({ version: 5 });
    const res = await makeRequest("prj-1");
    const body = await res.json();
    expect(body.version).toBe(5);
  });
});
