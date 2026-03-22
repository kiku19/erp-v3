// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  exceptionType: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof NextResponse),
}));

async function makeGetRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(new Request("http://localhost/api/planner/exception-types") as never);
}

async function makePostRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/exception-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("GET /api/planner/exception-types", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeGetRequest(false);
    expect(res.status).toBe(401);
  });

  it("returns exception types list", async () => {
    mockPrisma.exceptionType.findMany.mockResolvedValue([
      { id: "et-1", name: "Holiday", color: "error" },
      { id: "et-2", name: "Non-Working", color: "warning" },
    ]);
    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exceptionTypes).toHaveLength(2);
    expect(body.exceptionTypes[0].name).toBe("Holiday");
  });
});

describe("POST /api/planner/exception-types", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePostRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makePostRequest({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockPrisma.exceptionType.create.mockResolvedValue({ id: "et-new", name: "Custom", color: "success" });
    const res = await makePostRequest({ name: "Custom", color: "success" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("et-new");
    expect(body.color).toBe("success");
  });
});
