"use client";

import { useMemo } from "react";
import type {
  SpreadsheetRow,
  GroupByField,
  ResourceData,
  ResourceAssignmentData,
  ActivityData,
} from "./types";

/**
 * Transforms flat rows based on the active grouping mode.
 *
 * - "wbs": passthrough (default tree structure)
 * - "none": extract all activity/milestone rows, flatten to depth 0
 * - "resource": group activities under resource headers
 */
function useGroupedRows(
  flatRows: SpreadsheetRow[],
  groupBy: GroupByField,
  resources: ResourceData[],
  assignments: ResourceAssignmentData[],
  activities: ActivityData[],
): SpreadsheetRow[] {
  return useMemo(() => {
    if (groupBy === "wbs") return flatRows;

    if (groupBy === "none") {
      return flatRows
        .filter((r) => r.type === "activity" || r.type === "milestone")
        .map((r) => (r.depth === 0 ? r : { ...r, depth: 0 }));
    }

    // groupBy === "resource"
    return groupByResource(flatRows, resources, assignments, activities);
  }, [flatRows, groupBy, resources, assignments, activities]);
}

function groupByResource(
  flatRows: SpreadsheetRow[],
  resources: ResourceData[],
  assignments: ResourceAssignmentData[],
  _activities: ActivityData[],
): SpreadsheetRow[] {
  // Build activityId → resourceId[] map
  const activityToResources = new Map<string, string[]>();
  for (const a of assignments) {
    const list = activityToResources.get(a.activityId) ?? [];
    list.push(a.resourceId);
    activityToResources.set(a.activityId, list);
  }

  // Build resourceId → ResourceData map
  const resourceMap = new Map<string, ResourceData>();
  for (const r of resources) {
    resourceMap.set(r.id, r);
  }

  // Collect all activity/milestone rows (not WBS headers)
  const activityRows = flatRows.filter(
    (r) => r.type === "activity" || r.type === "milestone",
  );

  // Build resource groups: resourceId → rows[]
  const groups = new Map<string, SpreadsheetRow[]>();
  const unassigned: SpreadsheetRow[] = [];

  for (const row of activityRows) {
    const resourceIds = activityToResources.get(row.id);
    if (!resourceIds || resourceIds.length === 0) {
      unassigned.push(row);
      continue;
    }

    if (resourceIds.length === 1) {
      const resId = resourceIds[0];
      const list = groups.get(resId) ?? [];
      list.push(row);
      groups.set(resId, list);
    } else {
      // Activity assigned to multiple resources — duplicate with composite id
      for (const resId of resourceIds) {
        const list = groups.get(resId) ?? [];
        list.push({ ...row, id: `${row.id}::${resId}` });
        groups.set(resId, list);
      }
    }
  }

  // Sort resources alphabetically by name
  const sortedResourceIds = [...groups.keys()].sort((a, b) => {
    const nameA = resourceMap.get(a)?.name ?? "";
    const nameB = resourceMap.get(b)?.name ?? "";
    return nameA.localeCompare(nameB);
  });

  const result: SpreadsheetRow[] = [];

  for (const resId of sortedResourceIds) {
    const resource = resourceMap.get(resId);
    const headerRow: SpreadsheetRow = {
      id: `group-res-${resId}`,
      type: "group-header",
      depth: 0,
      name: resource?.name ?? resId,
      isExpanded: true,
      hasChildren: true,
      groupKey: resId,
    };
    result.push(headerRow);
    for (const row of groups.get(resId)!) {
      result.push(row.depth === 1 ? row : { ...row, depth: 1 });
    }
  }

  // Unassigned group
  if (unassigned.length > 0) {
    result.push({
      id: "group-res-unassigned",
      type: "group-header",
      depth: 0,
      name: "Unassigned",
      isExpanded: true,
      hasChildren: true,
      groupKey: "unassigned",
    });
    for (const row of unassigned) {
      result.push(row.depth === 1 ? row : { ...row, depth: 1 });
    }
  }

  return result;
}

export { useGroupedRows };
