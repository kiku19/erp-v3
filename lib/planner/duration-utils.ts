/**
 * Duration unit conversion utilities for planner activities.
 * Converts between different time units and working days.
 *
 * Working day assumptions:
 * - 1 day = 8 hours
 * - 1 week = 5 working days
 * - 1 month = 22 working days
 */

type DurationUnit = "hours" | "days" | "weeks" | "months";

const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const DAYS_PER_MONTH = 22;

/** Convert a duration value in the given unit to working days. */
function toDays(duration: number, unit: DurationUnit): number {
  switch (unit) {
    case "hours":
      return duration / HOURS_PER_DAY;
    case "days":
      return duration;
    case "weeks":
      return duration * DAYS_PER_WEEK;
    case "months":
      return duration * DAYS_PER_MONTH;
  }
}

/** Convert a duration in working days back to the given unit. */
function fromDays(days: number, unit: DurationUnit): number {
  switch (unit) {
    case "hours":
      return days * HOURS_PER_DAY;
    case "days":
      return days;
    case "weeks":
      return days / DAYS_PER_WEEK;
    case "months":
      return days / DAYS_PER_MONTH;
  }
}

export { toDays, fromDays, type DurationUnit };
