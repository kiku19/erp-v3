import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyPlannerEvent } from "./apply-event";

/* ─── Mock Prisma transaction client ─── */

function createMockTx() {
  return {
    wbsNode: {
      create: vi.fn().mockResolvedValue({ id: "wbs-1" }),
      update: vi.fn().mockResolvedValue({ id: "wbs-1" }),
    },
    activity: {
      create: vi.fn().mockResolvedValue({ id: "act-1" }),
      update: vi.fn().mockResolvedValue({ id: "act-1" }),
    },
  };
}

const TENANT_ID = "tenant-1";

describe("applyPlannerEvent", () => {
  let tx: ReturnType<typeof createMockTx>;

  beforeEach(() => {
    tx = createMockTx();
  });

  /* ── WBS events ── */

  it("applies wbs.created event", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "wbs.created",
      entityType: "wbs",
      entityId: "temp-wbs-1",
      payload: {
        projectId: "proj-1",
        parentId: null,
        wbsCode: "1",
        name: "Engineering",
        sortOrder: 0,
      },
    });

    expect(tx.wbsNode.create).toHaveBeenCalledWith({
      data: {
        id: "temp-wbs-1",
        tenantId: TENANT_ID,
        projectId: "proj-1",
        parentId: null,
        wbsCode: "1",
        name: "Engineering",
        sortOrder: 0,
      },
    });
  });

  it("applies wbs.updated event", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "wbs.updated",
      entityType: "wbs",
      entityId: "wbs-1",
      payload: { name: "Construction" },
    });

    expect(tx.wbsNode.update).toHaveBeenCalledWith({
      where: { id: "wbs-1" },
      data: { name: "Construction" },
    });
  });

  it("applies wbs.deleted event (soft delete)", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "wbs.deleted",
      entityType: "wbs",
      entityId: "wbs-1",
      payload: {},
    });

    expect(tx.wbsNode.update).toHaveBeenCalledWith({
      where: { id: "wbs-1" },
      data: { isDeleted: true },
    });
  });

  it("applies wbs.moved event", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "wbs.moved",
      entityType: "wbs",
      entityId: "wbs-2",
      payload: { parentId: "wbs-1", sortOrder: 3 },
    });

    expect(tx.wbsNode.update).toHaveBeenCalledWith({
      where: { id: "wbs-2" },
      data: { parentId: "wbs-1", sortOrder: 3 },
    });
  });

  /* ── Activity events ── */

  it("applies activity.created event", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.created",
      entityType: "activity",
      entityId: "temp-act-1",
      payload: {
        projectId: "proj-1",
        wbsNodeId: "wbs-1",
        activityId: "A1010",
        name: "Site Survey",
        activityType: "task",
        duration: 10,
        sortOrder: 0,
      },
    });

    expect(tx.activity.create).toHaveBeenCalledWith({
      data: {
        id: "temp-act-1",
        tenantId: TENANT_ID,
        projectId: "proj-1",
        wbsNodeId: "wbs-1",
        activityId: "A1010",
        name: "Site Survey",
        activityType: "task",
        duration: 10,
        durationUnit: "days",
        totalQuantity: 0,
        totalWorkHours: 0,
        sortOrder: 0,
      },
    });
  });

  it("applies activity.created with durationUnit and new fields", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.created",
      entityType: "activity",
      entityId: "temp-act-2",
      payload: {
        projectId: "proj-1",
        wbsNodeId: "wbs-1",
        activityId: "A1020",
        name: "Excavation",
        activityType: "task",
        duration: 2,
        durationUnit: "weeks",
        totalQuantity: 500,
        totalWorkHours: 80,
        sortOrder: 1,
      },
    });

    expect(tx.activity.create).toHaveBeenCalledWith({
      data: {
        id: "temp-act-2",
        tenantId: TENANT_ID,
        projectId: "proj-1",
        wbsNodeId: "wbs-1",
        activityId: "A1020",
        name: "Excavation",
        activityType: "task",
        duration: 2,
        durationUnit: "weeks",
        totalQuantity: 500,
        totalWorkHours: 80,
        sortOrder: 1,
      },
    });
  });

  it("applies activity.created for milestone (duration=0)", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.created",
      entityType: "activity",
      entityId: "temp-ms-1",
      payload: {
        projectId: "proj-1",
        wbsNodeId: "wbs-1",
        activityId: "M1001",
        name: "Engineering Complete",
        activityType: "milestone",
        duration: 0,
        sortOrder: 5,
      },
    });

    expect(tx.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityType: "milestone",
        duration: 0,
        durationUnit: "days",
        totalQuantity: 0,
        totalWorkHours: 0,
      }),
    });
  });

  it("applies activity.updated event with new fields", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.updated",
      entityType: "activity",
      entityId: "act-1",
      payload: { name: "Updated Survey", duration: 15, durationUnit: "hours", totalQuantity: 100, totalWorkHours: 40 },
    });

    expect(tx.activity.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { name: "Updated Survey", duration: 15, durationUnit: "hours", totalQuantity: 100, totalWorkHours: 40 },
    });
  });

  it("allows startDate/finishDate in activity.updated (frontend-computed), strips totalFloat", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.updated",
      entityType: "activity",
      entityId: "act-1",
      payload: { duration: 10, startDate: "2025-01-01", finishDate: "2025-01-11", totalFloat: 5 },
    });

    expect(tx.activity.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { duration: 10, startDate: "2025-01-01", finishDate: "2025-01-11" },
    });
  });

  it("applies activity.deleted event (soft delete)", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.deleted",
      entityType: "activity",
      entityId: "act-1",
      payload: {},
    });

    expect(tx.activity.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { isDeleted: true },
    });
  });

  it("applies activity.moved event", async () => {
    await applyPlannerEvent(tx as never, TENANT_ID, {
      eventType: "activity.moved",
      entityType: "activity",
      entityId: "act-1",
      payload: { wbsNodeId: "wbs-2", sortOrder: 2 },
    });

    expect(tx.activity.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { wbsNodeId: "wbs-2", sortOrder: 2 },
    });
  });

  /* ── Edge cases ── */

  it("throws on unknown event type", async () => {
    await expect(
      applyPlannerEvent(tx as never, TENANT_ID, {
        eventType: "unknown.event",
        entityType: "wbs",
        entityId: "wbs-1",
        payload: {},
      }),
    ).rejects.toThrow("Unknown event type: unknown.event");
  });
});
