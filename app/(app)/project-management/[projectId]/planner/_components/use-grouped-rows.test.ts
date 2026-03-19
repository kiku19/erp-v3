import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGroupedRows } from "./use-grouped-rows";
import type { SpreadsheetRow, ActivityData, ResourceData, ResourceAssignmentData } from "./types";

/* ─── Fixtures ─── */

const wbsRow: SpreadsheetRow = {
  id: "w1", type: "wbs", depth: 0, name: "Engineering",
  isExpanded: true, hasChildren: true, wbsCode: "1",
};

const actA: SpreadsheetRow = {
  id: "a1", type: "activity", depth: 1, name: "Design",
  isExpanded: false, hasChildren: false, activityId: "A10",
  duration: 5, startDate: "2026-01-01T00:00:00.000Z", finishDate: "2026-01-06T00:00:00.000Z",
};

const actB: SpreadsheetRow = {
  id: "a2", type: "activity", depth: 1, name: "Build",
  isExpanded: false, hasChildren: false, activityId: "A20",
  duration: 10, startDate: "2026-01-07T00:00:00.000Z", finishDate: "2026-01-17T00:00:00.000Z",
};

const milestone: SpreadsheetRow = {
  id: "m1", type: "milestone", depth: 1, name: "Done",
  isExpanded: false, hasChildren: false, activityId: "M1",
  duration: 0, startDate: "2026-01-17T00:00:00.000Z", finishDate: "2026-01-17T00:00:00.000Z",
};

const flatRows: SpreadsheetRow[] = [wbsRow, actA, actB, milestone];

const activities: ActivityData[] = [
  { id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Design", activityType: "task", duration: 5, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2026-01-01T00:00:00.000Z", finishDate: "2026-01-06T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 1 },
  { id: "a2", wbsNodeId: "w1", activityId: "A20", name: "Build", activityType: "task", duration: 10, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2026-01-07T00:00:00.000Z", finishDate: "2026-01-17T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 2 },
  { id: "m1", wbsNodeId: "w1", activityId: "M1", name: "Done", activityType: "milestone", duration: 0, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2026-01-17T00:00:00.000Z", finishDate: "2026-01-17T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 3 },
];

const resources: ResourceData[] = [
  { id: "r1", name: "Alice", resourceType: "labor", maxUnitsPerDay: 8, costPerUnit: 50, sortOrder: 1 },
  { id: "r2", name: "Bob", resourceType: "labor", maxUnitsPerDay: 8, costPerUnit: 60, sortOrder: 2 },
];

const assignments: ResourceAssignmentData[] = [
  { id: "ra1", activityId: "a1", resourceId: "r1", unitsPerDay: 8, budgetedCost: 400, actualCost: 0 },
  { id: "ra2", activityId: "a2", resourceId: "r2", unitsPerDay: 8, budgetedCost: 600, actualCost: 0 },
];

/* ─── Tests ─── */

describe("useGroupedRows", () => {
  it("returns rows unchanged when groupBy is 'wbs'", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "wbs", resources, assignments, activities),
    );
    expect(result.current).toBe(flatRows);
  });

  it("flattens all activity/milestone rows when groupBy is 'none'", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "none", resources, assignments, activities),
    );
    // Should exclude WBS rows, set depth to 0
    expect(result.current).toHaveLength(3);
    expect(result.current.every((r) => r.type !== "wbs")).toBe(true);
    expect(result.current.every((r) => r.depth === 0)).toBe(true);
  });

  it("groups activities by resource when groupBy is 'resource'", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, assignments, activities),
    );

    // Should have: group-header Alice, actA, group-header Bob, actB, group-header Unassigned, milestone
    const headers = result.current.filter((r) => r.type === "group-header");
    expect(headers.length).toBeGreaterThanOrEqual(2);
    // First header should be Alice (alphabetical)
    expect(headers[0].name).toBe("Alice");
    expect(headers[1].name).toBe("Bob");
  });

  it("puts activities with no assignment under 'Unassigned' group", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, assignments, activities),
    );
    const unassignedHeader = result.current.find(
      (r) => r.type === "group-header" && r.name === "Unassigned",
    );
    expect(unassignedHeader).toBeDefined();
    // Milestone m1 has no assignment — should be after the Unassigned header
    const unassignedIdx = result.current.indexOf(unassignedHeader!);
    const milestoneRow = result.current.find((r) => r.id === "m1" || r.id.startsWith("m1::"));
    expect(milestoneRow).toBeDefined();
    expect(result.current.indexOf(milestoneRow!)).toBeGreaterThan(unassignedIdx);
  });

  it("duplicates activities assigned to multiple resources", () => {
    const multiAssignments: ResourceAssignmentData[] = [
      ...assignments,
      { id: "ra3", activityId: "a1", resourceId: "r2", unitsPerDay: 4, budgetedCost: 200, actualCost: 0 },
    ];
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, multiAssignments, activities),
    );
    // actA should appear under both Alice and Bob
    const a1Rows = result.current.filter((r) => r.id === "a1" || r.id.startsWith("a1::"));
    expect(a1Rows).toHaveLength(2);
  });

  it("uses composite id for duplicated rows", () => {
    const multiAssignments: ResourceAssignmentData[] = [
      ...assignments,
      { id: "ra3", activityId: "a1", resourceId: "r2", unitsPerDay: 4, budgetedCost: 200, actualCost: 0 },
    ];
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, multiAssignments, activities),
    );
    const a1Rows = result.current.filter((r) => r.id === "a1" || r.id.startsWith("a1::"));
    // One should have composite id
    expect(a1Rows.some((r) => r.id.includes("::"))).toBe(true);
  });

  it("group-header rows have correct shape", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, assignments, activities),
    );
    const header = result.current.find((r) => r.type === "group-header");
    expect(header).toBeDefined();
    expect(header!.depth).toBe(0);
    expect(header!.isExpanded).toBe(true);
    expect(header!.hasChildren).toBe(true);
    expect(header!.groupKey).toBeDefined();
  });

  it("activities under resource headers have depth 1", () => {
    const { result } = renderHook(() =>
      useGroupedRows(flatRows, "resource", resources, assignments, activities),
    );
    const activitiesUnderHeaders = result.current.filter(
      (r) => r.type === "activity" || r.type === "milestone",
    );
    expect(activitiesUnderHeaders.every((r) => r.depth === 1)).toBe(true);
  });
});
