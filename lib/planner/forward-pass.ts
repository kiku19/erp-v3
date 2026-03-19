/**
 * Pure forward-pass scheduling algorithm (CPM).
 * Uses Kahn's topological sort to compute early start/finish dates.
 * Calendar-aware: skips non-working days when computing dates.
 */

import { addWorkingDays } from "./calendar-utils";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData } from "./calendar-types";

export interface ForwardPassActivity {
  id: string;
  duration: number;
  calendarId?: string;
}

export interface ForwardPassRelationship {
  predecessorId: string;
  successorId: string;
  lag: number;
}

export interface ScheduledDates {
  startDate: string;
  finishDate: string;
}

export interface ForwardPassOptions {
  calendars?: Map<string, CalendarData>;
  defaultCalendarId?: string;
}

/**
 * Compute early start/finish dates for all activities via forward pass.
 *
 * @param activities  - Array of { id, duration, calendarId? } (duration in working days)
 * @param relationships - FS relationships with optional lag
 * @param projectStartDate - ISO date string for the project start
 * @param options - Optional calendars map and default calendar ID
 * @returns Map of activityId → { startDate, finishDate } as ISO strings
 * @throws Error if a cycle is detected
 */
function forwardPass(
  activities: ForwardPassActivity[],
  relationships: ForwardPassRelationship[],
  projectStartDate: string,
  options?: ForwardPassOptions,
): Map<string, ScheduledDates> {
  if (activities.length === 0) return new Map();

  const calendars = options?.calendars ?? new Map<string, CalendarData>();
  const defaultCalendarId = options?.defaultCalendarId;

  function getCalendar(activityId: string): CalendarData {
    const calId = calendarIdMap.get(activityId);
    if (calId && calendars.has(calId)) return calendars.get(calId)!;
    if (defaultCalendarId && calendars.has(defaultCalendarId)) return calendars.get(defaultCalendarId)!;
    return DEFAULT_CALENDAR;
  }

  // Build calendarId lookup
  const calendarIdMap = new Map(
    activities.filter((a) => a.calendarId).map((a) => [a.id, a.calendarId!]),
  );

  // Build adjacency structures
  const inDegree = new Map<string, number>();
  const succMap = new Map<string, { successorId: string; lag: number }[]>();
  const predFinishes = new Map<string, { finish: Date; lag: number }[]>();

  for (const act of activities) {
    inDegree.set(act.id, 0);
    succMap.set(act.id, []);
  }

  for (const rel of relationships) {
    inDegree.set(rel.successorId, (inDegree.get(rel.successorId) ?? 0) + 1);
    succMap.get(rel.predecessorId)?.push({
      successorId: rel.successorId,
      lag: rel.lag,
    });
  }

  // Duration lookup
  const durationMap = new Map(activities.map((a) => [a.id, a.duration]));

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result = new Map<string, ScheduledDates>();
  const projectStart = new Date(projectStartDate);
  let processed = 0;

  while (queue.length > 0) {
    const actId = queue.shift()!;
    processed++;

    // Determine start date
    const predEntries = predFinishes.get(actId);
    let startDate: Date;

    const calendar = getCalendar(actId);

    if (!predEntries || predEntries.length === 0) {
      startDate = new Date(projectStart);
    } else {
      // Start = max(predecessor finish + lag working days)
      let maxMs = -Infinity;
      for (const entry of predEntries) {
        const lagDate = entry.lag >= 0
          ? addWorkingDays(entry.finish, entry.lag, calendar)
          : (() => {
              // Negative lag (lead): go backward in calendar days for simplicity
              const d = new Date(entry.finish);
              d.setUTCDate(d.getUTCDate() + entry.lag);
              return d;
            })();
        const ms = lagDate.getTime();
        if (ms > maxMs) maxMs = ms;
      }
      startDate = new Date(maxMs);
    }

    // Adjust start date to first working day (handles weekend/holiday starts)
    const adjustedStart = addWorkingDays(startDate, 0, calendar);
    startDate = adjustedStart;

    // Compute finish date using calendar-aware working days
    const duration = durationMap.get(actId) ?? 0;
    const finishDate = addWorkingDays(startDate, duration, calendar);

    result.set(actId, {
      startDate: startDate.toISOString(),
      finishDate: finishDate.toISOString(),
    });

    // Update successors
    const successors = succMap.get(actId) ?? [];
    for (const succ of successors) {
      if (!predFinishes.has(succ.successorId)) {
        predFinishes.set(succ.successorId, []);
      }
      predFinishes.get(succ.successorId)!.push({
        finish: finishDate,
        lag: succ.lag,
      });

      const newDeg = (inDegree.get(succ.successorId) ?? 1) - 1;
      inDegree.set(succ.successorId, newDeg);
      if (newDeg === 0) queue.push(succ.successorId);
    }
  }

  // Cycle detection: if not all activities were processed
  if (processed < activities.length) {
    throw new Error(
      "Cycle detected in activity relationships — cannot compute forward pass",
    );
  }

  return result;
}

export { forwardPass };
