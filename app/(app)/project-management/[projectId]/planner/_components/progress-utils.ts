import type { ActivityData, ResourceAssignmentData } from "./types";
import { MS_PER_DAY } from "./gantt-utils";

/* ─────────────────────── Types ────────────────────────────── */

interface PlannedProgressPoint {
  date: string; // ISO date
  percent: number; // 0-100
}

interface StatusCounts {
  completed: number;
  inProgress: number;
  notStarted: number;
  critical: number;
  total: number;
}

interface EVMMetrics {
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
}

/* ─────────────────────── Helpers ───────────────────────────── */

/** Compute how far through an activity we should be at a given date (0..1) */
function plannedFraction(activity: ActivityData, date: Date): number {
  if (!activity.startDate || !activity.finishDate) return 0;
  const start = new Date(activity.startDate).getTime();
  const finish = new Date(activity.finishDate).getTime();
  const span = finish - start;
  if (span <= 0) return date.getTime() >= start ? 1 : 0;
  const elapsed = date.getTime() - start;
  return Math.max(0, Math.min(1, elapsed / span));
}

/* ─────────────────────── computePlannedProgress ─────────────── */

function computePlannedProgress(
  activities: ActivityData[],
  projectStart: Date,
  projectEnd: Date,
): PlannedProgressPoint[] {
  const datedActivities = activities.filter((a) => a.startDate && a.finishDate);
  if (datedActivities.length === 0) return [];

  const totalDuration = datedActivities.reduce((sum, a) => sum + a.duration, 0);
  if (totalDuration === 0) return [];

  const points: PlannedProgressPoint[] = [];
  const startMs = projectStart.getTime();
  const endMs = projectEnd.getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));

  // Sample daily
  const step = Math.max(1, Math.floor(totalDays / Math.min(totalDays, 200)));

  for (let day = 0; day <= totalDays; day += step) {
    const dateMs = startMs + day * MS_PER_DAY;
    const date = new Date(dateMs);

    let weightedProgress = 0;
    for (const a of datedActivities) {
      const fraction = plannedFraction(a, date);
      weightedProgress += fraction * a.duration;
    }

    const percent = (weightedProgress / totalDuration) * 100;
    points.push({
      date: date.toISOString().split("T")[0],
      percent,
    });
  }

  // Ensure last point is included
  const lastPoint = points[points.length - 1];
  const endDateStr = projectEnd.toISOString().split("T")[0];
  if (lastPoint.date !== endDateStr) {
    let weightedProgress = 0;
    for (const a of datedActivities) {
      const fraction = plannedFraction(a, projectEnd);
      weightedProgress += fraction * a.duration;
    }
    points.push({
      date: endDateStr,
      percent: (weightedProgress / totalDuration) * 100,
    });
  }

  return points;
}

/* ─────────────────────── computeActualProgress ──────────────── */

function computeActualProgress(
  activities: ActivityData[],
  projectStart: Date,
  today: Date,
): PlannedProgressPoint[] {
  const datedActivities = activities.filter((a) => a.duration > 0);
  if (datedActivities.length === 0) return [];

  const totalDuration = datedActivities.reduce((sum, a) => sum + a.duration, 0);
  if (totalDuration === 0) return [];

  // Weighted average of current percentComplete
  const currentWeightedPct =
    datedActivities.reduce((sum, a) => sum + (a.percentComplete / 100) * a.duration, 0) /
    totalDuration *
    100;

  const points: PlannedProgressPoint[] = [];
  const startMs = projectStart.getTime();
  const todayMs = today.getTime();
  const totalDays = Math.max(1, Math.round((todayMs - startMs) / MS_PER_DAY));
  const step = Math.max(1, Math.floor(totalDays / Math.min(totalDays, 200)));

  for (let day = 0; day <= totalDays; day += step) {
    const dateMs = startMs + day * MS_PER_DAY;
    const date = new Date(dateMs);
    // Linear interpolation from 0 to current weighted progress
    const t = day / totalDays;
    const percent = t * currentWeightedPct;
    points.push({
      date: date.toISOString().split("T")[0],
      percent,
    });
  }

  // Ensure last point is today
  const lastPoint = points[points.length - 1];
  const todayStr = today.toISOString().split("T")[0];
  if (lastPoint.date !== todayStr) {
    points.push({ date: todayStr, percent: currentWeightedPct });
  }

  return points;
}

/* ─────────────────────── computeActivityStatusCounts ─────────── */

function computeActivityStatusCounts(activities: ActivityData[]): StatusCounts {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  let critical = 0;

  for (const a of activities) {
    if (a.percentComplete === 100) completed++;
    else if (a.percentComplete > 0) inProgress++;
    else notStarted++;

    if (a.totalFloat <= 0) critical++;
  }

  return { completed, inProgress, notStarted, critical, total: activities.length };
}

/* ─────────────────────── computeEVM ─────────────────────────── */

function computeEVM(
  activities: ActivityData[],
  assignments: ResourceAssignmentData[],
  today: Date,
): EVMMetrics | null {
  if (assignments.length === 0) return null;

  // Build activity lookup
  const activityMap = new Map<string, ActivityData>();
  for (const a of activities) {
    activityMap.set(a.id, a);
  }

  let pv = 0;
  let ev = 0;
  let ac = 0;

  for (const asgn of assignments) {
    const activity = activityMap.get(asgn.activityId);
    if (!activity) continue;

    const fraction = plannedFraction(activity, today);
    pv += asgn.budgetedCost * fraction;
    ev += asgn.budgetedCost * (activity.percentComplete / 100);
    ac += asgn.actualCost;
  }

  const spi = pv !== 0 ? ev / pv : 0;
  const cpi = ac !== 0 ? ev / ac : 0;
  const sv = ev - pv;
  const cv = ev - ac;

  return { pv, ev, ac, spi, cpi, sv, cv };
}

/* ─────────────────────── Exports ──────────────────────────── */

export {
  computePlannedProgress,
  computeActualProgress,
  computeActivityStatusCounts,
  computeEVM,
  type PlannedProgressPoint,
  type StatusCounts,
  type EVMMetrics,
};
