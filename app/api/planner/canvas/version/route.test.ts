// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  plannerSnapshot: { findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof Response),
}));

async function makeRequest(projectId?: string, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
  );
  const { GET } = await import("./route");
  const url = projectId
    ? `http://localhost:3000/api/planner/canvas/version?projectId=${projectId}`
    : "http://localhost:3000/api/planner/canvas/version";
  return GET(new Request(url, { headers: { Authorization: "Bearer t" } }) as never);
}

describe("GET /api/planner/canvas/version", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeRequest("p-1", false);
    expect(res.status).toBe(401);
  });

  it("returns 400 without projectId", async () => {
    const res = await makeRequest(undefined);
    expect(res.status).toBe(400);
  });

  it("returns version 0 when no snapshot", async () => {
    mockPrisma.plannerSnapshot.findUnique.mockResolvedValue(null);
    const res = await makeRequest("p-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(0);
  });

  it("returns correct version from snapshot", async () => {
    mockPrisma.plannerSnapshot.findUnique.mockResolvedValue({ version: 7 });
    const res = await makeRequest("p-1");
    const body = await res.json();
    expect(body.version).toBe(7);
  });
});
