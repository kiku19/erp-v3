import { describe, it, expect } from "vitest";
import { snapshotForLayout, type LayoutStructure } from "./snapshot-for-layout";
import type { PlannerState } from "./build-planner-state";

describe("snapshotForLayout", () => {
  const basePlannerState: PlannerState = {
    wbsNodes: [
      { id: "w1", parentId: null, wbsCode: "1", name: "Engineering", sortOrder: 0 },
      { id: "w2", parentId: "w1", wbsCode: "1.1", name: "Design", sortOrder: 0 },
    ],
    activities: [
      {
        id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Survey",
        activityType: "task", duration: 5, durationUnit: "days",
        totalQuantity: 100, totalWorkHours: 40,
        startDate: "2025-01-06T00:00:00.000Z", finishDate: "2025-01-11T00:00:00.000Z",
        percentComplete: 50, sortOrder: 0,
      },
      {
        id: "a2", wbsNodeId: "w2", activityId: "A20", name: "Design Doc",
        activityType: "task", duration: 2, durationUnit: "weeks",
        totalQuantity: 0, totalWorkHours: 0,
        startDate: "2025-01-11T00:00:00.000Z", finishDate: "2025-01-21T00:00:00.000Z",
        percentComplete: 25, sortOrder: 0,
      },
    ],
    relationships: [
      { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
    ],
    resources: [
      { id: "res1", name: "John", resourceType: "labor", maxUnitsPerDay: 8, costPerUnit: 50, sortOrder: 0 },
    ],
    resourceAssignments: [
      { id: "ra1", activityId: "a1", resourceId: "res1", unitsPerDay: 8, budgetedCost: 400, actualCost: 200 },
    ],
  };

  it("extracts wbsNodes, activities, and relationships", () => {
    const layout = snapshotForLayout(basePlannerState);
    expect(layout.wbsNodes).toHaveLength(2);
    expect(layout.activities).toHaveLength(2);
    expect(layout.relationships).toHaveLength(1);
  });

  it("nulls out startDate, finishDate on activities", () => {
    const layout = snapshotForLayout(basePlannerState);
    for (const act of layout.activities) {
      expect(act.startDate).toBeNull();
      expect(act.finishDate).toBeNull();
    }
  });

  it("zeros out percentComplete on activities", () => {
    const layout = snapshotForLayout(basePlannerState);
    for (const act of layout.activities) {
      expect(act.percentComplete).toBe(0);
    }
  });

  it("preserves duration, durationUnit, totalQuantity, totalWorkHours", () => {
    const layout = snapshotForLayout(basePlannerState);
    expect(layout.activities[0].duration).toBe(5);
    expect(layout.activities[0].durationUnit).toBe("days");
    expect(layout.activities[0].totalQuantity).toBe(100);
    expect(layout.activities[0].totalWorkHours).toBe(40);
    expect(layout.activities[1].durationUnit).toBe("weeks");
  });

  it("excludes resources and resourceAssignments", () => {
    const layout = snapshotForLayout(basePlannerState);
    expect(layout).not.toHaveProperty("resources");
    expect(layout).not.toHaveProperty("resourceAssignments");
  });

  it("handles empty state", () => {
    const layout = snapshotForLayout({
      wbsNodes: [], activities: [], relationships: [],
      resources: [], resourceAssignments: [],
    });
    expect(layout.wbsNodes).toHaveLength(0);
    expect(layout.activities).toHaveLength(0);
    expect(layout.relationships).toHaveLength(0);
  });
});
