/**
 * Orchestrates full schedule recomputation:
 * 1. Normalize durations (calendar-aware when calendars provided)
 * 2. Run forwardPass() → early start/finish
 * 3. Return Map<activityId, { startDate, finishDate }>
 */

import { toDays, type DurationUnit } from "./duration-utils";
import { computeDurationDays } from "./calendar-utils";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData } from "./calendar-types";
import { forwardPass, type ForwardPassRelationship } from "./forward-pass";

interface ScheduleActivity {
  id: string;
  duration: number;
  durationUnit: string;
  totalWorkHours?: number;
  calendarId?: string;
}

interface ScheduleResult {
  startDate: string;
  finishDate: string;
}

interface ComputeScheduleOptions {
  calendars?: Map<string, CalendarData>;
  defaultCalendarId?: string;
}

function computeSchedule(
  activities: ScheduleActivity[],
  relationships: ForwardPassRelationship[],
  projectStartDate: string,
  options?: ComputeScheduleOptions,
): Map<string, ScheduleResult> {
  if (activities.length === 0) return new Map();

  const calendars = options?.calendars ?? new Map<string, CalendarData>();
  const defaultCalendarId = options?.defaultCalendarId;

  function getCalendar(calendarId?: string): CalendarData {
    if (calendarId && calendars.has(calendarId)) return calendars.get(calendarId)!;
    if (defaultCalendarId && calendars.has(defaultCalendarId)) return calendars.get(defaultCalendarId)!;
    return DEFAULT_CALENDAR;
  }

  // Normalize durations to working days
  const normalizedActivities = activities.map((a) => {
    const calendar = getCalendar(a.calendarId);
    let durationDays: number;

    if (a.totalWorkHours && a.totalWorkHours > 0) {
      // Duration computed from totalWorkHours / hoursPerDay
      durationDays = computeDurationDays(a.totalWorkHours, calendar);
    } else {
      // Backward compatibility: use duration + unit conversion
      durationDays = toDays(a.duration, (a.durationUnit || "days") as DurationUnit);
    }

    return {
      id: a.id,
      duration: durationDays,
      calendarId: a.calendarId,
    };
  });

  // Forward pass → early dates
  const forwardResults = forwardPass(
    normalizedActivities,
    relationships,
    projectStartDate,
    { calendars, defaultCalendarId },
  );

  // Build final result
  const result = new Map<string, ScheduleResult>();
  for (const act of activities) {
    const fp = forwardResults.get(act.id);
    if (fp) {
      result.set(act.id, {
        startDate: fp.startDate,
        finishDate: fp.finishDate,
      });
    }
  }

  return result;
}

export { computeSchedule, type ScheduleActivity, type ScheduleResult, type ComputeScheduleOptions };
