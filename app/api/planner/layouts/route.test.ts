// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  project: { findFirst: vi.fn() },
  projectLayout: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  wbsNode: { findMany: vi.fn().mockResolvedValue([]) },
  activity: { findMany: vi.fn().mockResolvedValue([]) },
  activityRelationship: { findMany: vi.fn().mockResolvedValue([]) },
  resource: { findMany: vi.fn().mockResolvedValue([]) },
  resourceAssignment: { findMany: vi.fn().mockResolvedValue([]) },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

async function makePostRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

async function makeGetRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(
    new Request("http://localhost/api/planner/layouts") as never,
  );
}

describe("POST /api/planner/layouts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePostRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makePostRequest({ invalid: true });
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    const res = await makePostRequest({ projectId: "nope", name: "Layout 1" });
    expect(res.status).toBe(404);
  });

  it("returns 201 on success", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p-1" });
    mockPrisma.projectLayout.create.mockResolvedValue({ id: "layout-1", name: "Layout 1" });

    const res = await makePostRequest({ projectId: "p-1", name: "Layout 1" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("layout-1");
    expect(body.name).toBe("Layout 1");
  });
});

describe("GET /api/planner/layouts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeGetRequest(false);
    expect(res.status).toBe(401);
  });

  it("returns layouts list", async () => {
    mockPrisma.projectLayout.findMany.mockResolvedValue([
      { id: "l-1", name: "Layout A", description: "", sourceProjectId: "p-1", createdAt: new Date() },
    ]);

    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.layouts).toHaveLength(1);
    expect(body.layouts[0].name).toBe("Layout A");
  });
});
