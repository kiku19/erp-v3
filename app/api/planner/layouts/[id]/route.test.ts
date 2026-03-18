// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  projectLayout: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

const paramsPromise = Promise.resolve({ id: "layout-1" });

async function makeGetRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(
    new Request("http://localhost/api/planner/layouts/layout-1") as never,
    { params: paramsPromise },
  );
}

async function makePatchRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/planner/layouts/layout-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: paramsPromise },
  );
}

describe("GET /api/planner/layouts/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeGetRequest(false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue(null);
    const res = await makeGetRequest();
    expect(res.status).toBe(404);
  });

  it("returns layout on success", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue({
      id: "layout-1", name: "Layout A", description: "desc",
      structure: { wbsNodes: [], activities: [], relationships: [] },
    });
    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Layout A");
  });
});

describe("PATCH /api/planner/layouts/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue(null);
    const res = await makePatchRequest({ name: "New Name" });
    expect(res.status).toBe(404);
  });

  it("returns updated layout", async () => {
    mockPrisma.projectLayout.findFirst.mockResolvedValue({ id: "layout-1" });
    mockPrisma.projectLayout.update.mockResolvedValue({
      id: "layout-1", name: "New Name", description: "Updated",
    });
    const res = await makePatchRequest({ name: "New Name", description: "Updated" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("New Name");
  });
});
