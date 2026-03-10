/**
 * Date utility functions for timezone handling.
 * All dates are stored in UTC in the database and converted to user timezone in responses.
 */

/**
 * Validates if a timezone string is valid using Intl API
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a UTC date string to the specified timezone
 * @param date - Date object or ISO string in UTC
 * @param timezone - IANA timezone string (e.g., "Asia/Kolkata", "America/New_York")
 * @returns ISO 8601 string with the correct offset for the timezone
 */
export function convertToUserTimezone(
  date: Date | string,
  timezone: string
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date");
  }

  // Validate timezone
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Parse the formatted string and construct the ISO string with offset
  const parts = formatter.formatToParts(dateObj);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");

  // Get the timezone offset
  const tzDate = new Date(dateObj.toLocaleString("en-US", { timeZone: timezone }));
  const utcDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = utcDate.getTime() - tzDate.getTime();
  const offsetHours = Math.floor(Math.abs(offsetMs) / 3600000);
  const offsetMinutes = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);
  const offsetSign = offsetMs >= 0 ? "+" : "-";

  const offset = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(
    offsetMinutes
  ).padStart(2, "0")}`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

/**
 * Parses a date string in a given timezone and returns a UTC Date
 * @param date - Date string in the specified timezone
 * @param timezone - IANA timezone string
 * @returns Date object in UTC
 */
export function convertToUTC(date: string, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // Create a date by interpreting the string in the given timezone
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date string");
  }

  // Get the offset for the timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Format the date in the target timezone and create a new date from those parts
  const parts = formatter.formatToParts(dateObj);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const year = parseInt(getPart("year"), 10);
  const month = parseInt(getPart("month"), 10) - 1;
  const day = parseInt(getPart("day"), 10);
  const hour = parseInt(getPart("hour"), 10);
  const minute = parseInt(getPart("minute"), 10);
  const second = parseInt(getPart("second"), 10);

  // Create a date treating the components as local to the timezone
  // Then convert to UTC by getting the UTC equivalent
  const isoString = new Date(Date.UTC(year, month, day, hour, minute, second));
  return isoString;
}

/**
 * Gets the timezone offset in minutes for a given timezone
 */
export function getTimezoneOffset(timezone: string): number {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));

  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

/**
 * Formats a date in the user's timezone with a given format
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date");
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options,
  }).format(dateObj);
}
