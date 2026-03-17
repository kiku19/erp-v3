"use client";

import { useMemo } from "react";
import type { SpreadsheetRow, SortConfig } from "./types";

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

/* ─────────────────────── Tree-aware sort ───────────────────────── */

/**
 * Sorts flatRows while preserving the WBS tree hierarchy.
 *
 * Strategy: each WBS node stays in its current position relative to its
 * sibling WBS nodes, but the activities *within* each WBS group are sorted
 * by the specified column. This preserves the tree structure while giving
 * the user meaningful sorting of activities.
 *
 * Performance: O(n log n) per WBS group. Since groups are small, this is
 * effectively O(n) for the full tree.
 */
function sortFlatRows(rows: SpreadsheetRow[], sort: SortConfig): SpreadsheetRow[] {
  if (rows.length === 0) return rows;

  // Group consecutive activity/milestone rows under their preceding WBS row.
  // We walk the flat list and build "segments": a WBS header + its activities.
  const result: SpreadsheetRow[] = [];
  let currentWbsRow: SpreadsheetRow | null = null;
  let currentActivities: SpreadsheetRow[] = [];

  function flushGroup() {
    if (currentWbsRow) {
      result.push(currentWbsRow);
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
    currentWbsRow = null;
  }

  for (const row of rows) {
    if (row.type === "wbs") {
      // Flush the previous group before starting a new one
      flushGroup();
      currentWbsRow = row;
    } else {
      // Activity or milestone — accumulate under current WBS
      currentActivities.push(row);
    }
  }

  // Flush the last group
  flushGroup();

  return result;
}

/* ─────────────────────── Hook ─────────────────────────────────── */

/**
 * Returns a memoized sorted copy of flatRows.
 * When sortConfig is null, returns the original rows unchanged (WBS sort order).
 */
function useSortedRows(
  flatRows: SpreadsheetRow[],
  sortConfig: SortConfig | null,
): SpreadsheetRow[] {
  return useMemo(() => {
    if (!sortConfig) return flatRows;
    return sortFlatRows(flatRows, sortConfig);
  }, [flatRows, sortConfig]);
}

export { useSortedRows, sortFlatRows, getSortValue, compareValues };
