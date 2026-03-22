/**
 * Shared calendar types used by both the scheduling engine and UI.
 * These mirror the Prisma Calendar / CalendarException models
 * but are plain interfaces suitable for frontend use.
 */

export interface WorkDayConfig {
  day: string;
  working: boolean;
  startTime: string;
  endTime: string;
}

export interface ExceptionTypeData {
  id: string;
  name: string;
  color: string;
}

export interface CalendarExceptionData {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  exceptionType: ExceptionTypeData;
  reason: string | null;
  workHours: number | null;
}

export interface CalendarData {
  id: string;
  name: string;
  category: "global" | "project" | "resource";
  hoursPerDay: number;
  workDays: WorkDayConfig[];
  exceptions: CalendarExceptionData[];
}

/** Day names in order matching JS Date.getUTCDay() (0=Sunday). */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_WORK_DAYS: WorkDayConfig[] = DAY_NAMES.map((day) => ({
  day,
  working: day !== "Saturday" && day !== "Sunday",
  startTime: "09:00",
  endTime: "17:00",
}));

const DEFAULT_CALENDAR: CalendarData = {
  id: "default",
  name: "Standard 5-Day Work Week",
  category: "global",
  hoursPerDay: 8,
  workDays: DEFAULT_WORK_DAYS,
  exceptions: [],
};

/** Convert legacy number[] working days to WorkDayConfig[]. */
function numberDaysToWorkDayConfig(days: number[], hoursPerDay: number): WorkDayConfig[] {
  return DAY_NAMES.map((day, idx) => ({
    day,
    working: days.includes(idx),
    startTime: "09:00",
    endTime: `${String(9 + hoursPerDay).padStart(2, "0")}:00`,
  }));
}

export { DEFAULT_CALENDAR, DEFAULT_WORK_DAYS, DAY_NAMES, numberDaysToWorkDayConfig };
