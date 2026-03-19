import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSortedRows, sortFlatRows } from "./use-sorted-rows";
import type { SpreadsheetRow, SortConfig } from "./types";

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

const wbsRow2: SpreadsheetRow = {
  id: "w2", type: "wbs", depth: 0, name: "Testing",
  isExpanded: true, hasChildren: true, wbsCode: "2",
};

const actC: SpreadsheetRow = {
  id: "a3", type: "activity", depth: 1, name: "Alpha",
  isExpanded: false, hasChildren: false, activityId: "A30",
  duration: 3, startDate: "2026-02-01T00:00:00.000Z", finishDate: "2026-02-04T00:00:00.000Z",
};

const groupHeader: SpreadsheetRow = {
  id: "group-res-r1", type: "group-header", depth: 0, name: "Alice",
  isExpanded: true, hasChildren: true, groupKey: "r1",
};

const groupHeader2: SpreadsheetRow = {
  id: "group-res-r2", type: "group-header", depth: 0, name: "Bob",
  isExpanded: true, hasChildren: true, groupKey: "r2",
};

const flatRows = [wbsRow, actA, actB, wbsRow2, actC];
const sort: SortConfig = { column: "name", direction: "asc" };

/* ─── Tests ─── */

describe("useSortedRows", () => {
  it("returns original rows when sortConfig is null", () => {
    const { result } = renderHook(() => useSortedRows(flatRows, null, "wbs"));
    expect(result.current).toBe(flatRows);
  });

  it("sorts within WBS segments when groupBy is 'wbs'", () => {
    const { result } = renderHook(() => useSortedRows(flatRows, sort, "wbs"));
    // WBS headers preserved
    expect(result.current[0]).toBe(wbsRow);
    expect(result.current[3]).toBe(wbsRow2);
    // Activities under Engineering sorted: Build < Design (name asc)
    expect(result.current[1].name).toBe("Build");
    expect(result.current[2].name).toBe("Design");
    // Activity under Testing unchanged
    expect(result.current[4].name).toBe("Alpha");
  });

  it("preserves WBS rows when sorting with groupBy 'wbs'", () => {
    const { result } = renderHook(() => useSortedRows(flatRows, sort, "wbs"));
    const types = result.current.map((r) => r.type);
    expect(types).toEqual(["wbs", "activity", "activity", "wbs", "activity"]);
  });

  it("sorts within group-header segments when groupBy is 'resource'", () => {
    const resourceRows = [
      groupHeader,
      { ...actB, depth: 1 },
      { ...actA, depth: 1 },
      groupHeader2,
      { ...actC, depth: 1 },
    ];
    const { result } = renderHook(() =>
      useSortedRows(resourceRows, sort, "resource"),
    );
    // Group headers should be preserved
    expect(result.current[0]).toEqual(groupHeader);
    expect(result.current[3]).toEqual(groupHeader2);
    // Activities under Alice sorted: Build < Design (name asc)
    expect(result.current[1].name).toBe("Build");
    expect(result.current[2].name).toBe("Design");
  });

  it("sorts flat list when groupBy is 'none'", () => {
    const flatActivities = [
      { ...actB, depth: 0 },
      { ...actA, depth: 0 },
      { ...actC, depth: 0 },
    ];
    const { result } = renderHook(() =>
      useSortedRows(flatActivities, sort, "none"),
    );
    const names = result.current.map((r) => r.name);
    expect(names).toEqual(["Alpha", "Build", "Design"]);
  });
});

describe("sortFlatRows", () => {
  it("preserves WBS segment boundaries in tree-aware mode", () => {
    const result = sortFlatRows(flatRows, sort, "resource");
    // Should keep WBS rows as segment boundaries
    expect(result[0].type).toBe("wbs");
    expect(result[3].type).toBe("wbs");
  });

  it("keeps WBS rows and sorts within segments in wbs mode", () => {
    const result = sortFlatRows(flatRows, sort, "wbs");
    expect(result.filter((r) => r.type === "wbs")).toHaveLength(2);
    expect(result).toHaveLength(5);
  });

  it("treats group-header as segment boundary", () => {
    const rows = [groupHeader, actB, actA, groupHeader2, actC];
    const result = sortFlatRows(rows, sort, "resource");
    // Group headers preserved in order
    expect(result[0]).toBe(groupHeader);
    expect(result[3]).toBe(groupHeader2);
  });
});
