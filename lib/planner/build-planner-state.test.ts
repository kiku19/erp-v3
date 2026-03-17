import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPlannerState } from "./build-planner-state";

/* ─── Mock Prisma client ─── */

function createMockPrisma() {
  return {
    wbsNode: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    activityRelationship: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    resource: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    resourceAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

const TENANT_ID = "tenant-1";
const PROJECT_ID = "proj-1";

describe("buildPlannerState", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("returns empty arrays when no data exists", async () => {
    const result = await buildPlannerState(
      mockPrisma as never,
      TENANT_ID,
      PROJECT_ID,
    );

    expect(result).toEqual({ wbsNodes: [], activities: [], relationships: [], resources: [], resourceAssignments: [] });
  });

  it("queries with correct tenant and project filters", async () => {
    await buildPlannerState(mockPrisma as never, TENANT_ID, PROJECT_ID);

    expect(mockPrisma.wbsNode.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        isDeleted: false,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        parentId: true,
        wbsCode: true,
        name: true,
        sortOrder: true,
      },
    });

    expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        isDeleted: false,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        wbsNodeId: true,
        activityId: true,
        name: true,
        activityType: true,
        duration: true,
        startDate: true,
        finishDate: true,
        totalFloat: true,
        percentComplete: true,
        sortOrder: true,
      },
    });
  });

  it("returns wbsNodes and activities from DB", async () => {
    const wbsData = [
      { id: "w1", parentId: null, wbsCode: "1", name: "Engineering", sortOrder: 0 },
      { id: "w2", parentId: "w1", wbsCode: "1.1", name: "Design", sortOrder: 0 },
    ];
    const actData = [
      {
        id: "a1",
        wbsNodeId: "w2",
        activityId: "A1010",
        name: "Survey",
        activityType: "task",
        duration: 10,
        startDate: new Date("2026-01-01"),
        finishDate: new Date("2026-01-15"),
        totalFloat: 0,
        percentComplete: 0,
        sortOrder: 0,
      },
    ];

    mockPrisma.wbsNode.findMany.mockResolvedValue(wbsData);
    mockPrisma.activity.findMany.mockResolvedValue(actData);

    const result = await buildPlannerState(
      mockPrisma as never,
      TENANT_ID,
      PROJECT_ID,
    );

    expect(result.wbsNodes).toHaveLength(2);
    expect(result.wbsNodes[0].wbsCode).toBe("1");
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].activityId).toBe("A1010");
  });

  it("serializes dates to ISO strings", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([
      {
        id: "a1",
        wbsNodeId: "w1",
        activityId: "A1010",
        name: "Survey",
        activityType: "task",
        duration: 10,
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        finishDate: new Date("2026-03-15T00:00:00.000Z"),
        totalFloat: 0,
        percentComplete: 0,
        sortOrder: 0,
      },
    ]);

    const result = await buildPlannerState(
      mockPrisma as never,
      TENANT_ID,
      PROJECT_ID,
    );

    expect(result.activities[0].startDate).toBe("2026-03-01T00:00:00.000Z");
    expect(result.activities[0].finishDate).toBe("2026-03-15T00:00:00.000Z");
  });

  it("returns null for null dates", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([
      {
        id: "a1",
        wbsNodeId: "w1",
        activityId: "A1010",
        name: "Survey",
        activityType: "task",
        duration: 0,
        startDate: null,
        finishDate: null,
        totalFloat: 0,
        percentComplete: 0,
        sortOrder: 0,
      },
    ]);

    const result = await buildPlannerState(
      mockPrisma as never,
      TENANT_ID,
      PROJECT_ID,
    );

    expect(result.activities[0].startDate).toBeNull();
    expect(result.activities[0].finishDate).toBeNull();
  });
});
