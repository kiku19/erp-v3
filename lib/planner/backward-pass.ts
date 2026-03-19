/**
 * Pure backward-pass scheduling algorithm (CPM).
 * Reverse topological sort to compute late start/finish and total float.
 * Calendar-aware: uses working day arithmetic for date calculations.
 */

import type { ForwardPassRelationship, ScheduledDates } from "./forward-pass";
import { subtractWorkingDays, countWorkingDaysBetween } from "./calendar-utils";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData } from "./calendar-types";

export interface BackwardPassResult {
  lateStart: string;
  lateFinish: string;
  totalFloat: number;
}

export interface BackwardPassActivity {
  id: string;
  duration: number;
  calendarId?: string;
}

export interface BackwardPassOptions {
  calendars?: Map<string, CalendarData>;
  defaultCalendarId?: string;
}

/**
 * Compute late start/finish dates and total float for all activities via backward pass.
 *
 * @param activities    - Array of { id, duration, calendarId? } (duration in working days)
 * @param relationships - FS relationships with optional lag
 * @param forwardResults - Results from forwardPass (early start/finish)
 * @param options - Optional calendars map and default calendar ID
 * @returns Map of activityId → { lateStart, lateFinish, totalFloat }
 */
function backwardPass(
  activities: BackwardPassActivity[],
  relationships: ForwardPassRelationship[],
  forwardResults: Map<string, ScheduledDates>,
  options?: BackwardPassOptions,
): Map<string, BackwardPassResult> {
  if (activities.length === 0) return new Map();

  const MS_PER_DAY = 86_400_000;

  const calendars = options?.calendars ?? new Map<string, CalendarData>();
  const defaultCalendarId = options?.defaultCalendarId;

  function getCalendar(activityId: string): CalendarData {
    const calId = calendarIdMap.get(activityId);
    if (calId && calendars.has(calId)) return calendars.get(calId)!;
    if (defaultCalendarId && calendars.has(defaultCalendarId)) return calendars.get(defaultCalendarId)!;
    return DEFAULT_CALENDAR;
  }

  const calendarIdMap = new Map(
    activities.filter((a) => a.calendarId).map((a) => [a.id, a.calendarId!]),
  );

  // Find project end (max early finish across all activities)
  let projectEndMs = -Infinity;
  for (const act of activities) {
    const fp = forwardResults.get(act.id);
    if (fp) {
      const efMs = new Date(fp.finishDate).getTime();
      if (efMs > projectEndMs) projectEndMs = efMs;
    }
  }

  // Build reverse adjacency: for each activity, track its successors' late starts
  // We'll do a reverse Kahn's: start from terminal activities (no successors)
  const outDegree = new Map<string, number>();
  const predMap = new Map<string, { predecessorId: string; lag: number }[]>();
  const succMap = new Map<string, { successorId: string; lag: number }[]>();

  for (const act of activities) {
    outDegree.set(act.id, 0);
    predMap.set(act.id, []);
    succMap.set(act.id, []);
  }

  for (const rel of relationships) {
    outDegree.set(rel.predecessorId, (outDegree.get(rel.predecessorId) ?? 0) + 1);
    predMap.get(rel.successorId)?.push({
      predecessorId: rel.predecessorId,
      lag: rel.lag,
    });
    succMap.get(rel.predecessorId)?.push({
      successorId: rel.successorId,
      lag: rel.lag,
    });
  }

  // Duration lookup
  const durationMap = new Map(activities.map((a) => [a.id, a.duration]));

  // Start from terminal activities (outDegree === 0)
  const queue: string[] = [];
  for (const [id, deg] of outDegree) {
    if (deg === 0) queue.push(id);
  }

  const result = new Map<string, BackwardPassResult>();

  // Track late starts of successors for each activity
  const succLateStarts = new Map<string, { lateStart: Date; lag: number }[]>();

  while (queue.length > 0) {
    const actId = queue.shift()!;
    const duration = durationMap.get(actId) ?? 0;

    // Determine late finish
    const succEntries = succLateStarts.get(actId);
    let lateFinish: Date;

    const calendar = getCalendar(actId);

    if (!succEntries || succEntries.length === 0) {
      // Terminal activity: late finish = project end
      lateFinish = new Date(projectEndMs);
    } else {
      // Late finish = min(successor late start - lag)
      let minMs = Infinity;
      for (const entry of succEntries) {
        const lagDate = entry.lag >= 0
          ? (() => {
              // Subtract positive lag working days from successor's late start
              const d = new Date(entry.lateStart);
              d.setUTCDate(d.getUTCDate() - entry.lag);
              // Use calendar-day subtraction for lag to match forward pass negative lag
              return d;
            })()
          : (() => {
              const d = new Date(entry.lateStart);
              d.setUTCDate(d.getUTCDate() - entry.lag);
              return d;
            })();
        const ms = lagDate.getTime();
        if (ms < minMs) minMs = ms;
      }
      lateFinish = new Date(minMs);
    }

    // Late start = late finish - duration (calendar-aware)
    const lateStart = subtractWorkingDays(lateFinish, duration, calendar);

    // Total float = working days between early start and late start
    const fp = forwardResults.get(actId);
    const earlyStart = fp ? new Date(fp.startDate) : new Date(0);
    const totalFloat = lateStart >= earlyStart
      ? countWorkingDaysBetween(earlyStart, lateStart, calendar)
      : -countWorkingDaysBetween(lateStart, earlyStart, calendar);

    result.set(actId, {
      lateStart: lateStart.toISOString(),
      lateFinish: lateFinish.toISOString(),
      totalFloat,
    });

    // Process predecessors
    const preds = predMap.get(actId) ?? [];
    for (const pred of preds) {
      if (!succLateStarts.has(pred.predecessorId)) {
        succLateStarts.set(pred.predecessorId, []);
      }
      succLateStarts.get(pred.predecessorId)!.push({
        lateStart,
        lag: pred.lag,
      });

      const newOutDeg = (outDegree.get(pred.predecessorId) ?? 1) - 1;
      outDegree.set(pred.predecessorId, newOutDeg);
      if (newOutDeg === 0) queue.push(pred.predecessorId);
    }
  }

  return result;
}

export { backwardPass };
