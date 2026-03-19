"use client";

import { useMemo } from "react";
import type { SpreadsheetRow, SortConfig, GroupByField } from "./types";

/* ─────────────────────── Sort value extractors ─────────────────── */

/**
 * Extract a comparable value from a SpreadsheetRow for each sortable column.
 * Returns: number | string | null — null means "sort last".
 */
function getSortValue(row: SpreadsheetRow, column: SortConfig["column"]): number | string | null {
  switch (column) {
    case "id":
      // For WBS rows use wbsCode, for activities use activityId
      return row.activityId ?? row.wbsCode ?? null;
    case "name":
      return row.name.toLowerCase();
    case "duration":
      return row.duration ?? null;
    case "start":
      // Convert ISO date strings to timestamps for correct numeric comparison
      return row.startDate ? new Date(row.startDate).getTime() : null;
    case "finish":
      return row.finishDate ? new Date(row.finishDate).getTime() : null;
    case "float":
      return row.totalFloat ?? null;
    case "pct":
      return row.percentComplete ?? null;
    case "pred":
      return row.predecessors ?? null;
    default:
      return null;
  }
}

/**
 * Compare two sort values. Nulls are always sorted last regardless of direction.
 */
function compareValues(a: number | string | null, b: number | string | null, direction: "asc" | "desc"): number {
  // Nulls always last
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  let result: number;

  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else if (typeof a === "string" && typeof b === "string") {
    // For activityId columns like "A10", "A20", "M1" — extract numeric part for natural sort
    const aNum = extractNumericId(a);
    const bNum = extractNumericId(b);
    if (aNum !== null && bNum !== null) {
      result = aNum - bNum;
    } else {
      result = a.localeCompare(b);
    }
  } else {
    // Mixed types — convert to string
    result = String(a).localeCompare(String(b));
  }

  return direction === "desc" ? -result : result;
}

/** Extract leading numeric portion from IDs like "A10" → 10, "1.2.3" → 1.2 */
function extractNumericId(s: string): number | null {
  const match = s.match(/(\d+(?:\.\d+)*)/);
  if (!match) return null;
  // For WBS codes like "1.2.3", convert to a sortable number: 1*10000 + 2*100 + 3
  const parts = match[1].split(".");
  if (parts.length === 1) return parseInt(parts[0], 10);
  let val = 0;
  for (let i = 0; i < parts.length; i++) {
    val = val * 1000 + parseInt(parts[i], 10);
  }
  return val;
}

/* ─────────────────────── Sort strategies ─────────────────────────── */

/** Check if a row type acts as a segment boundary (group header) */
function isSegmentBoundary(row: SpreadsheetRow): boolean {
  return row.type === "wbs" || row.type === "group-header";
}

/**
 * Sorts flatRows based on the active grouping mode.
 *
 * - groupBy "wbs" + sort active → flatten all activities (remove WBS rows), sort globally
 * - groupBy "resource" → sort within each group-header segment
 * - groupBy "none" → sort the entire flat list
 * - Default (no groupBy match) → sort within WBS/group-header segments
 */
function sortFlatRows(rows: SpreadsheetRow[], sort: SortConfig, groupBy: GroupByField = "wbs"): SpreadsheetRow[] {
  if (rows.length === 0) return rows;

  // WBS grouping + sort active → sort activities within each WBS segment
  if (groupBy === "wbs") {
    return sortWithinSegments(rows, sort);
  }

  // "none" grouping → sort entire list globally
  if (groupBy === "none") {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aVal = getSortValue(a, sort.column);
      const bVal = getSortValue(b, sort.column);
      return compareValues(aVal, bVal, sort.direction);
    });
    return sorted;
  }

  // "resource" (or any segment-based grouping) → sort within each segment
  return sortWithinSegments(rows, sort);
}

/**
 * Sorts activities within each segment (WBS or group-header boundaries).
 * Segment boundary rows stay in place; activities between them are sorted.
 */
function sortWithinSegments(rows: SpreadsheetRow[], sort: SortConfig): SpreadsheetRow[] {
  const result: SpreadsheetRow[] = [];
  let currentHeaderRow: SpreadsheetRow | null = null;
  let currentActivities: SpreadsheetRow[] = [];

  function flushGroup() {
    if (currentHeaderRow) {
      result.push(currentHeaderRow);
    }
    if (currentActivities.length > 1) {
      currentActivities.sort((a, b) => {
        const aVal = getSortValue(a, sort.column);
        const bVal = getSortValue(b, sort.column);
        return compareValues(aVal, bVal, sort.direction);
      });
    }
    for (const act of currentActivities) {
      result.push(act);
    }
    currentActivities = [];
    currentHeaderRow = null;
  }

  for (const row of rows) {
    if (isSegmentBoundary(row)) {
      flushGroup();
      currentHeaderRow = row;
    } else {
      currentActivities.push(row);
    }
  }

  flushGroup();
  return result;
}

/* ─────────────────────── Hook ─────────────────────────────────── */

/**
 * Returns a memoized sorted copy of flatRows.
 * When sortConfig is null, returns the original rows unchanged.
 * groupBy controls how sorting interacts with row grouping.
 */
function useSortedRows(
  flatRows: SpreadsheetRow[],
  sortConfig: SortConfig | null,
  groupBy: GroupByField = "wbs",
): SpreadsheetRow[] {
  return useMemo(() => {
    if (!sortConfig) return flatRows;
    return sortFlatRows(flatRows, sortConfig, groupBy);
  }, [flatRows, sortConfig, groupBy]);
}

export { useSortedRows, sortFlatRows, getSortValue, compareValues };
