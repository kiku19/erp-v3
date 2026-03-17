import type { ActivityData, ResourceAssignmentData } from "./types";
import { dateToX, MS_PER_DAY } from "./gantt-utils";

/* ─────────────────────── Types ──────────────────────────────── */

interface DailyUsage {
  date: string; // ISO date YYYY-MM-DD
  units: number;
}

interface HistogramBar {
  x: number;       // pixel x
  width: number;   // pixel width (1 day)
  height: number;  // pixel height (proportional to units)
  units: number;
  isOverAllocated: boolean;
}

/* ─────────────────────── computeResourceUsage ───────────────── */

/**
 * Compute daily resource usage for a resource across all its assignments.
 * For each assignment, finds the activity's start/finish dates and
 * spreads unitsPerDay across each day in that range.
 */
function computeResourceUsage(
  resourceId: string,
  assignments: ResourceAssignmentData[],
  activities: ActivityData[],
): DailyUsage[] {
  const activityMap = new Map(activities.map((a) => [a.id, a]));
  const usageMap = new Map<string, number>();

  const relevantAssignments = assignments.filter((a) => a.resourceId === resourceId);

  for (const assignment of relevantAssignments) {
    const activity = activityMap.get(assignment.activityId);
    if (!activity || !activity.startDate || !activity.finishDate) continue;

    const start = new Date(activity.startDate);
    const end = new Date(activity.finishDate);
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      usageMap.set(key, (usageMap.get(key) ?? 0) + assignment.unitsPerDay);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const result: DailyUsage[] = [];
  for (const [date, units] of usageMap) {
    result.push({ date, units });
  }
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/* ─────────────────────── isOverAllocated ─────────────────────── */

/**
 * Check if resource exceeds maxUnitsPerDay on any date.
 */
function isOverAllocated(
  usage: DailyUsage[],
  maxUnitsPerDay: number,
): boolean {
  return usage.some((u) => u.units > maxUnitsPerDay);
}

/* ─────────────────────── computeHistogramBars ───────────────── */

/**
 * Compute histogram bar data for canvas rendering.
 * Bar height is proportional to units relative to maxUnitsPerDay,
 * capped at maxHeight.
 */
function computeHistogramBars(
  usage: DailyUsage[],
  maxUnitsPerDay: number,
  timelineStart: Date,
  pxPerDay: number,
  maxHeight: number,
): HistogramBar[] {
  return usage.map((u) => {
    const barDate = new Date(u.date);
    const x = dateToX(barDate, timelineStart, pxPerDay);
    const ratio = Math.min(u.units / maxUnitsPerDay, 1);
    const height = ratio * maxHeight;

    return {
      x,
      width: pxPerDay,
      height,
      units: u.units,
      isOverAllocated: u.units > maxUnitsPerDay,
    };
  });
}

/* ─────────────────────── Exports ──────────────────────────────── */

export {
  computeResourceUsage,
  isOverAllocated,
  computeHistogramBars,
  type DailyUsage,
  type HistogramBar,
};
