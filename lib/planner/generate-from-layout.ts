/**
 * Generates a new project structure from a layout snapshot.
 * Remaps all IDs to new CUIDs and computes initial dates via CPM.
 */

import { randomUUID } from "crypto";
import type { LayoutStructure } from "./snapshot-for-layout";
import type { WbsNodeData, ActivityData, RelationshipData } from "./build-planner-state";
import { computeSchedule } from "./compute-schedule";

interface GeneratedStructure {
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
  relationships: RelationshipData[];
}

function generateFromLayout(
  layout: LayoutStructure,
  projectStartDate: string,
): GeneratedStructure {
  if (layout.wbsNodes.length === 0 && layout.activities.length === 0) {
    return { wbsNodes: [], activities: [], relationships: [] };
  }

  // Build ID remap tables
  const wbsIdMap = new Map<string, string>();
  for (const node of layout.wbsNodes) {
    wbsIdMap.set(node.id, randomUUID());
  }

  const actIdMap = new Map<string, string>();
  for (const act of layout.activities) {
    actIdMap.set(act.id, randomUUID());
  }

  const relIdMap = new Map<string, string>();
  for (const rel of layout.relationships) {
    relIdMap.set(rel.id, randomUUID());
  }

  // Remap WBS nodes
  const wbsNodes: WbsNodeData[] = layout.wbsNodes.map((n) => ({
    id: wbsIdMap.get(n.id)!,
    parentId: n.parentId ? (wbsIdMap.get(n.parentId) ?? null) : null,
    wbsCode: n.wbsCode,
    name: n.name,
    sortOrder: n.sortOrder,
  }));

  // Remap relationships
  const relationships: RelationshipData[] = layout.relationships.map((r) => ({
    id: relIdMap.get(r.id)!,
    predecessorId: actIdMap.get(r.predecessorId)!,
    successorId: actIdMap.get(r.successorId)!,
    relationshipType: r.relationshipType,
    lag: r.lag,
  }));

  // Compute schedule for new activities
  const scheduleInput = layout.activities.map((a) => ({
    id: actIdMap.get(a.id)!,
    duration: a.duration,
    durationUnit: a.durationUnit,
  }));
  const scheduleRels = relationships.map((r) => ({
    predecessorId: r.predecessorId,
    successorId: r.successorId,
    lag: r.lag,
  }));

  const schedule = computeSchedule(scheduleInput, scheduleRels, projectStartDate);

  // Remap activities with computed dates
  const activities: ActivityData[] = layout.activities.map((a) => {
    const newId = actIdMap.get(a.id)!;
    const dates = schedule.get(newId);
    return {
      id: newId,
      wbsNodeId: wbsIdMap.get(a.wbsNodeId)!,
      activityId: a.activityId,
      name: a.name,
      activityType: a.activityType,
      duration: a.duration,
      durationUnit: a.durationUnit,
      totalQuantity: a.totalQuantity,
      totalWorkHours: a.totalWorkHours,
      startDate: dates?.startDate ?? null,
      finishDate: dates?.finishDate ?? null,
      percentComplete: 0,
      sortOrder: a.sortOrder,
    };
  });

  return { wbsNodes, activities, relationships };
}

export { generateFromLayout, type GeneratedStructure };
