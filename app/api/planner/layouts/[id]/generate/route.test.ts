// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockTx = {
  project: { create: vi.fn() },
  wbsNode: { create: vi.fn() },
  activity: { create: vi.fn() },
  activityRelationship: { create: vi.fn() },
  plannerSnapshot: { create: vi.fn() },
};

const mockPrisma = {
  projectLayout: { findFirst: vi.fn() },
  project: { findFirst: vi.fn() },
  $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

const paramsPromise = Promise.resolve({ id: "layout-1" });

const sampleStructure = {
  wbsNodes: [
    { id: "w1", parentId: null, wbsCode: "1", name: "WBS 1", sortOrder: 0 },
  ],
  activities: [
    {
      id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Task",
      activityType: "task", duration: 5, durationUnit: "days",
      totalQuantity: 0, totalWorkHours: 0,
      startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0, sortOrder: 0,
    },
  ],
  relationships: [],
};

async function makeRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/layouts/layout-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: paramsPromise },
  );
}

describe("POST /api/planner/layouts/:id/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.project.create.mockResolvedValue({ id: "new-proj", name: "New Project" });
    mockTx.wbsNode.create.mockResolvedValue({});
    mockTx.activity.create.mockResolvedValue({});
    mockTx.activityRelationship.create.mockResolvedValue({});
    mockTx.plannerSnapshot.create.mockResolvedValue({});
  });

  it("returns 401 without auth", async () => {
    const res = await makeRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makeRequest({ invalid: true });
    expect(res.status).toBe(400);
  });

  it("returns 404 when layout not found", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue(null);
    const res = await makeRequest({
      epsId: "eps-1", projectId: "P001", name: "New Project",
      startDate: "2025-01-06T00:00:00.000Z",
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when project ID already exists", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue({ id: "layout-1", structure: sampleStructure });
    mockPrisma.project.findFirst.mockResolvedValue({ id: "existing" });
    const res = await makeRequest({
      epsId: "eps-1", projectId: "P001", name: "New Project",
      startDate: "2025-01-06T00:00:00.000Z",
    });
    expect(res.status).toBe(409);
  });

  it("returns 201 and creates project from layout", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue({ id: "layout-1", structure: sampleStructure });
    mockPrisma.project.findFirst.mockResolvedValue(null);

    const res = await makeRequest({
      epsId: "eps-1", projectId: "P001", name: "New Project",
      startDate: "2025-01-06T00:00:00.000Z",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.projectId).toBe("new-proj");
    expect(body.wbsCount).toBe(1);
    expect(body.activityCount).toBe(1);

    // Verify WBS + activity + snapshot were created
    expect(mockTx.wbsNode.create).toHaveBeenCalledOnce();
    expect(mockTx.activity.create).toHaveBeenCalledOnce();
    expect(mockTx.plannerSnapshot.create).toHaveBeenCalledOnce();
  });
});
