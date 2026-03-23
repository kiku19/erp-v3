/**
 * Calendar-aware date arithmetic for CPM scheduling.
 *
 * Core functions that replace the old "add N calendar days" approach
 * with working-day-aware logic that respects weekends, holidays,
 * and custom calendar configurations.
 */

import type { CalendarData, CalendarExceptionData } from "./calendar-types";
import { DAY_NAMES } from "./calendar-types";

/* ─── Exception lookup ─── */

interface ExceptionEntry {
  exceptionType: string;
  workHours: number | null;
}

/**
 * Pre-index exceptions by "YYYY-MM-DD" string for O(1) lookup.
 * Multi-day exceptions (date → endDate) expand into one entry per day.
 */
function buildExceptionSet(
  exceptions: CalendarExceptionData[],
): Map<string, ExceptionEntry> {
  const map = new Map<string, ExceptionEntry>();

  for (const ex of exceptions) {
    const entry: ExceptionEntry = {
      exceptionType: ex.exceptionType,
      workHours: ex.workHours,
    };

    const startDate = new Date(ex.date);
    const endDate = ex.endDate ? new Date(ex.endDate) : startDate;

    const current = new Date(startDate);
    while (current <= endDate) {
      map.set(toDateKey(current), entry);
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return map;
}

/** Format a Date to "YYYY-MM-DD" string for exception lookup. */
function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ─── Day checks ─── */

/**
 * Check if a date is a working day per the calendar.
 * Returns true for normal working days AND half days.
 * Returns false for weekends, holidays, and non-working exceptions.
 */
function isWorkingDay(date: Date, calendar: CalendarData): boolean {
  const exceptionSet = buildExceptionSet(calendar.exceptions);
  return isWorkingDayFast(date, calendar, exceptionSet);
}

/** Internal version using pre-built exception set. */
function isWorkingDayFast(
  date: Date,
  calendar: CalendarData,
  exceptionSet: Map<string, ExceptionEntry>,
): boolean {
  // Check exceptions first (they override the work week)
  const key = toDateKey(date);
  const exception = exceptionSet.get(key);
  if (exception) {
    return exception.exceptionType === "Half Day";
  }

  // Check work week configuration
  const dayIndex = date.getUTCDay(); // 0=Sunday
  const dayName = DAY_NAMES[dayIndex];
  const dayConfig = calendar.workDays.find((d) => d.day === dayName);
  return dayConfig?.working ?? false;
}

/**
 * Get the number of work hours for a specific date.
 * Returns 0 for non-working days, hoursPerDay for normal days,
 * or the exception's workHours for half days.
 */
function getWorkHoursForDay(date: Date, calendar: CalendarData): number {
  const exceptionSet = buildExceptionSet(calendar.exceptions);
  return getWorkHoursForDayFast(date, calendar, exceptionSet);
}

/** Internal version using pre-built exception set. */
function getWorkHoursForDayFast(
  date: Date,
  calendar: CalendarData,
  exceptionSet: Map<string, ExceptionEntry>,
): number {
  const key = toDateKey(date);
  const exception = exceptionSet.get(key);
  if (exception) {
    if (exception.exceptionType === "Half Day" && exception.workHours != null) {
      return exception.workHours;
    }
    return 0; // Holiday or Non-Working
  }

  const dayIndex = date.getUTCDay();
  const dayName = DAY_NAMES[dayIndex];
  const dayConfig = calendar.workDays.find((d) => d.day === dayName);
  return dayConfig?.working ? calendar.hoursPerDay : 0;
}

/* ─── Working day arithmetic ─── */

/**
 * Add `durationDays` working days to a start date, skipping non-working days.
 *
 * If the start date falls on a non-working day, it is first moved forward
 * to the next working day before counting begins.
 *
 * Returns the finish date (start of the day AFTER the last working day,
 * matching the existing CPM convention where finish = start + duration).
 */
function addWorkingDays(
  startDate: Date,
  durationDays: number,
  calendar: CalendarData,
): Date {
  const exceptionSet = buildExceptionSet(calendar.exceptions);
  const current = new Date(startDate);

  // Move to first working day if starting on a non-working day
  while (!isWorkingDayFast(current, calendar, exceptionSet)) {
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (durationDays === 0) return new Date(current);

  // Count working days
  let remaining = durationDays;
  while (remaining > 0) {
    if (isWorkingDayFast(current, calendar, exceptionSet)) {
      remaining--;
    }
    if (remaining > 0) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  // Move to next calendar day (finish = day after last working day)
  current.setUTCDate(current.getUTCDate() + 1);
  return current;
}

/**
 * Subtract `durationDays` working days from a date, going backward.
 *
 * If the date falls on a non-working day, it is first moved backward
 * to the previous working day before counting begins.
 */
function subtractWorkingDays(
  date: Date,
  durationDays: number,
  calendar: CalendarData,
): Date {
  const exceptionSet = buildExceptionSet(calendar.exceptions);
  const current = new Date(date);

  if (durationDays === 0) return new Date(current);

  // Move backward to previous working day if on a non-working day
  // First step back one day since date is "start of next day" convention
  current.setUTCDate(current.getUTCDate() - 1);
  while (!isWorkingDayFast(current, calendar, exceptionSet)) {
    current.setUTCDate(current.getUTCDate() - 1);
  }

  // Count working days backward (we already counted one by landing on a working day)
  let remaining = durationDays - 1;
  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() - 1);
    if (isWorkingDayFast(current, calendar, exceptionSet)) {
      remaining--;
    }
  }

  return current;
}

/* ─── Duration computation ─── */

/**
 * Compute duration in working days from total work hours.
 * Uses `Math.ceil` so partial days round up to a full day.
 */
function computeDurationDays(
  totalWorkHours: number,
  calendar: CalendarData,
): number {
  if (totalWorkHours === 0) return 0;
  return Math.ceil(totalWorkHours / calendar.hoursPerDay);
}

/**
 * Count the number of working days between two dates (exclusive of end).
 * Used for computing total float in CPM.
 */
function countWorkingDaysBetween(
  startDate: Date,
  endDate: Date,
  calendar: CalendarData,
): number {
  if (startDate >= endDate) return 0;
  const exceptionSet = buildExceptionSet(calendar.exceptions);
  let count = 0;
  const current = new Date(startDate);
  while (current < endDate) {
    if (isWorkingDayFast(current, calendar, exceptionSet)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

export {
  isWorkingDay,
  getWorkHoursForDay,
  addWorkingDays,
  subtractWorkingDays,
  computeDurationDays,
  buildExceptionSet,
  countWorkingDaysBetween,
};
