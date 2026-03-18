// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockTx = {
  plannerSnapshot: { findUnique: vi.fn(), upsert: vi.fn() },
  plannerEvent: { create: vi.fn() },
  activity: { create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
  wbsNode: { create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
  activityRelationship: { create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
  project: { update: vi.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  project: { findFirst: vi.fn() },
  $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

async function makeRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/planner/canvas/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /api/planner/canvas/save", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeRequest({ projectId: "p", baseVersion: 0, events: [] }, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makeRequest({ invalid: true });
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    const res = await makeRequest({ projectId: "nope", baseVersion: 0, events: [] });
    expect(res.status).toBe(404);
  });

  it("returns 409 on version conflict", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p" });
    mockTx.plannerSnapshot.findUnique.mockResolvedValue({ version: 3 });
    const res = await makeRequest({ projectId: "p", baseVersion: 1, events: [] });
    expect(res.status).toBe(409);
  });

  it("returns 200 with new version on success", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p" });
    mockTx.plannerSnapshot.findUnique.mockResolvedValue({ version: 0 });
    mockTx.plannerSnapshot.upsert.mockResolvedValue({});
    mockTx.plannerEvent.create.mockResolvedValue({});

    const res = await makeRequest({
      projectId: "p",
      baseVersion: 0,
      events: [{ eventType: "activity.created", entityType: "activity", entityId: "a-1", payload: { name: "Test" } }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(1);
    expect(mockTx.plannerEvent.create).toHaveBeenCalledOnce();
  });

  it("runs schedule recomputation after applying events when project has startDate", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p", startDate: new Date("2025-01-06") });
    mockTx.plannerSnapshot.findUnique.mockResolvedValue({ version: 0 });
    mockTx.plannerSnapshot.upsert.mockResolvedValue({});
    mockTx.plannerEvent.create.mockResolvedValue({});
    mockTx.activity.findMany.mockResolvedValue([
      { id: "a-1", duration: 5, durationUnit: "days" },
      { id: "a-2", duration: 3, durationUnit: "days" },
    ]);
    mockTx.activityRelationship.findMany.mockResolvedValue([
      { predecessorId: "a-1", successorId: "a-2", lag: 0 },
    ]);

    const res = await makeRequest({
      projectId: "p",
      baseVersion: 0,
      events: [{ eventType: "activity.created", entityType: "activity", entityId: "a-1", payload: { name: "Test" } }],
    });
    expect(res.status).toBe(200);

    // Verify activities were updated with computed dates
    expect(mockTx.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "a-1" },
        data: expect.objectContaining({
          startDate: expect.any(Date),
          finishDate: expect.any(Date),
        }),
      }),
    );
    expect(mockTx.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "a-2" },
        data: expect.objectContaining({
          startDate: expect.any(Date),
          finishDate: expect.any(Date),
        }),
      }),
    );
  });

  it("skips schedule recomputation when project has no startDate", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p", startDate: null });
    mockTx.plannerSnapshot.findUnique.mockResolvedValue({ version: 0 });
    mockTx.plannerSnapshot.upsert.mockResolvedValue({});
    mockTx.plannerEvent.create.mockResolvedValue({});
    mockTx.activity.findMany.mockResolvedValue([
      { id: "a-1", duration: 5, durationUnit: "days" },
    ]);
    mockTx.activityRelationship.findMany.mockResolvedValue([]);

    const res = await makeRequest({
      projectId: "p",
      baseVersion: 0,
      events: [{ eventType: "activity.created", entityType: "activity", entityId: "a-1", payload: { name: "Test" } }],
    });
    expect(res.status).toBe(200);

    // activity.update should not be called for schedule recomputation
    // (it may be called by applyPlannerEvent for other reasons, but not with startDate/finishDate)
    const updateCalls = mockTx.activity.update.mock.calls;
    const scheduleCalls = updateCalls.filter((call: unknown[]) => {
      const data = (call[0] as { data: Record<string, unknown> }).data;
      return "startDate" in data && "finishDate" in data;
    });
    expect(scheduleCalls).toHaveLength(0);
  });
});
