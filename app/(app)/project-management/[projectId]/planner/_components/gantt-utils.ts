import type { ActivityData, GanttZoomLevel, GanttRowHeight, BarLabelFormat, GanttSettings } from "./types";

/* ─────────────────────── Constants ────────────────────────────── */

const MS_PER_DAY = 86_400_000;
const TIMELINE_PAD_DAYS = 14;
const BAR_HEIGHT = 16;
const MILESTONE_SIZE = 12;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─────────────────────── Default Settings ─────────────────────── */

const DEFAULT_GANTT_SETTINGS: GanttSettings = {
  zoomLevel: "month-week",
  barLabelFormat: "idAndName",
  barColorScheme: "criticality",
  rowHeight: "normal",
  showCriticalPath: true,
  showBaselines: true,
  showTodayLine: true,
  showGridLines: true,
  showRelationshipArrows: true,
  showLegend: true,
};

/* ─────────────────────── Date ↔ Pixel ─────────────────────────── */

function dateToX(date: Date, startDate: Date, pxPerDay: number): number {
  const diffMs = date.getTime() - startDate.getTime();
  return (diffMs / MS_PER_DAY) * pxPerDay;
}

function xToDate(x: number, startDate: Date, pxPerDay: number): Date {
  const days = x / pxPerDay;
  return new Date(startDate.getTime() + days * MS_PER_DAY);
}

/* ─────────────────────── Criticality ──────────────────────────── */

function isCritical(activity: ActivityData): boolean {
  return activity.totalFloat <= 0;
}

/* ─────────────────────── Zoom (P6-style) ──────────────────────── */

function getZoomPixelsPerDay(level: GanttZoomLevel): number {
  switch (level) {
    case "year-quarter":
      return 0.5;
    case "quarter-month":
      return 2;
    case "month-week":
      return 8;
    case "week-day":
      return 40;
    case "day-hour":
      return 80;
  }
}

const ZOOM_ORDER: GanttZoomLevel[] = [
  "year-quarter", "quarter-month", "month-week", "week-day", "day-hour",
];

function zoomIn(current: GanttZoomLevel): GanttZoomLevel {
  const idx = ZOOM_ORDER.indexOf(current);
  return idx < ZOOM_ORDER.length - 1 ? ZOOM_ORDER[idx + 1] : current;
}

function zoomOut(current: GanttZoomLevel): GanttZoomLevel {
  const idx = ZOOM_ORDER.indexOf(current);
  return idx > 0 ? ZOOM_ORDER[idx - 1] : current;
}

/* ─────────────────────── Row Height ─────────────────────────────── */

function getRowHeightPx(height: GanttRowHeight): number {
  switch (height) {
    case "compact":
      return 24;
    case "normal":
      return 32;
    case "expanded":
      return 40;
  }
}

/* ─────────────────────── Bar Label Formatter ────────────────────── */

function formatBarLabel(activity: ActivityData, format: BarLabelFormat): string {
  switch (format) {
    case "activityId":
      return activity.activityId;
    case "name":
      return activity.name;
    case "idAndName":
      return `${activity.activityId} - ${activity.name}`;
    case "none":
      return "";
  }
}

/* ─────────────────────── Timeline Range ───────────────────────── */

function getTimelineRange(
  activities: ActivityData[],
  projectStart: string | null,
  projectFinish: string | null,
): { start: Date; end: Date } {
  let minDate = projectStart ? new Date(projectStart) : null;
  let maxDate = projectFinish ? new Date(projectFinish) : null;

  for (const a of activities) {
    if (a.startDate) {
      const d = new Date(a.startDate);
      if (!minDate || d < minDate) minDate = d;
    }
    if (a.finishDate) {
      const d = new Date(a.finishDate);
      if (!maxDate || d > maxDate) maxDate = d;
    }
  }

  const now = new Date();
  if (!minDate) minDate = now;
  if (!maxDate) maxDate = new Date(now.getTime() + 90 * MS_PER_DAY);

  // Pad
  const start = new Date(minDate.getTime() - TIMELINE_PAD_DAYS * MS_PER_DAY);
  const end = new Date(maxDate.getTime() + TIMELINE_PAD_DAYS * MS_PER_DAY);

  return { start, end };
}

/* ─────────────────────── Bar Geometry ──────────────────────────── */

interface BarGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

function computeBarGeometry(
  activity: ActivityData,
  timelineStart: Date,
  pxPerDay: number,
  rowIndex: number,
  rowHeight: number,
): BarGeometry {
  if (!activity.startDate || !activity.finishDate) {
    return { x: 0, y: rowIndex * rowHeight + (rowHeight - BAR_HEIGHT) / 2, width: 0, height: BAR_HEIGHT };
  }
  const startX = dateToX(new Date(activity.startDate), timelineStart, pxPerDay);
  const endX = dateToX(new Date(activity.finishDate), timelineStart, pxPerDay);
  const width = Math.max(endX - startX, 1);
  const y = rowIndex * rowHeight + (rowHeight - BAR_HEIGHT) / 2;
  return { x: startX, y, width, height: BAR_HEIGHT };
}

/* ─────────────────────── Milestone Geometry ────────────────────── */

interface MilestoneGeometry {
  cx: number;
  cy: number;
  size: number;
}

function computeMilestoneGeometry(
  activity: ActivityData,
  timelineStart: Date,
  pxPerDay: number,
  rowIndex: number,
  rowHeight: number,
): MilestoneGeometry {
  const dateStr = activity.startDate ?? activity.finishDate;
  const cx = dateStr ? dateToX(new Date(dateStr), timelineStart, pxPerDay) : 0;
  const cy = rowIndex * rowHeight + rowHeight / 2;
  return { cx, cy, size: MILESTONE_SIZE };
}

/* ─────────────────────── Header Cell Type ──────────────────────── */

interface HeaderCell {
  label: string;
  x: number;
  width: number;
}

/* ─────────────────────── Year Headers ──────────────────────────── */

function generateYearHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    const daysInYear = Math.round((yearEnd.getTime() - yearStart.getTime()) / MS_PER_DAY);
    const x = dateToX(yearStart, start, pxPerDay);
    const width = daysInYear * pxPerDay;
    headers.push({ label: `${year}`, x, width });
  }

  return headers;
}

/* ─────────────────────── Quarter Headers ───────────────────────── */

function generateQuarterHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const startYear = start.getUTCFullYear();
  const startQuarter = Math.floor(start.getUTCMonth() / 3);
  const endYear = end.getUTCFullYear();
  const endQuarter = Math.floor(end.getUTCMonth() / 3);

  let year = startYear;
  let quarter = startQuarter;

  while (year < endYear || (year === endYear && quarter <= endQuarter)) {
    const qStartMonth = quarter * 3;
    const qStart = new Date(Date.UTC(year, qStartMonth, 1));
    const qEnd = new Date(Date.UTC(year, qStartMonth + 3, 1));
    const daysInQuarter = Math.round((qEnd.getTime() - qStart.getTime()) / MS_PER_DAY);
    const x = dateToX(qStart, start, pxPerDay);
    const width = daysInQuarter * pxPerDay;
    headers.push({ label: `Q${quarter + 1} ${year}`, x, width });

    quarter++;
    if (quarter > 3) {
      quarter = 0;
      year++;
    }
  }

  return headers;
}

/* ─────────────────────── Month Headers ─────────────────────────── */

function generateMonthHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const x = dateToX(monthStart, start, pxPerDay);
    const width = daysInMonth * pxPerDay;
    headers.push({
      label: `${MONTH_SHORT[month]} ${year}`,
      x,
      width,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return headers;
}

/* ─────────────────────── Week Headers ──────────────────────────── */

function generateWeekHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const cursor = new Date(start);
  const dayOfWeek = cursor.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  cursor.setUTCDate(cursor.getUTCDate() + mondayOffset);

  let weekNum = 1;
  while (cursor <= end) {
    const x = dateToX(cursor, start, pxPerDay);
    const width = 7 * pxPerDay;
    headers.push({
      label: `W${weekNum}`,
      x,
      width,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    weekNum++;
  }

  return headers;
}

/* ─────────────────────── Day Headers ───────────────────────────── */

function generateDayHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

  while (cursor <= end) {
    const dayOfWeek = cursor.getUTCDay();
    const dayOfMonth = cursor.getUTCDate();
    const x = dateToX(cursor, start, pxPerDay);
    const width = pxPerDay;
    headers.push({
      label: `${DAY_SHORT[dayOfWeek]} ${dayOfMonth}`,
      x,
      width,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return headers;
}

/* ─────────────────────── Hour Headers ──────────────────────────── */

function generateHourHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  const pxPerHour = pxPerDay / 24;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

  while (cursor <= end) {
    for (let h = 0; h < 24; h++) {
      const hourDate = new Date(cursor.getTime() + h * 3_600_000);
      if (hourDate > end && h > 0) break;
      const x = dateToX(hourDate, start, pxPerDay);
      let label: string;
      if (h === 0) label = "12a";
      else if (h < 12) label = `${h}a`;
      else if (h === 12) label = "12p";
      else label = `${h - 12}p`;
      headers.push({ label, x, width: pxPerHour });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return headers;
}

/* ─────────────────────── Headers for Zoom Level ────────────────── */

function getHeadersForZoomLevel(
  level: GanttZoomLevel,
  start: Date,
  end: Date,
  pxPerDay: number,
): { topHeaders: HeaderCell[]; bottomHeaders: HeaderCell[] } {
  switch (level) {
    case "year-quarter":
      return { topHeaders: generateYearHeaders(start, end, pxPerDay), bottomHeaders: generateQuarterHeaders(start, end, pxPerDay) };
    case "quarter-month":
      return { topHeaders: generateQuarterHeaders(start, end, pxPerDay), bottomHeaders: generateMonthHeaders(start, end, pxPerDay) };
    case "month-week":
      return { topHeaders: generateMonthHeaders(start, end, pxPerDay), bottomHeaders: generateWeekHeaders(start, end, pxPerDay) };
    case "week-day":
      return { topHeaders: generateWeekHeaders(start, end, pxPerDay), bottomHeaders: generateDayHeaders(start, end, pxPerDay) };
    case "day-hour":
      return { topHeaders: generateDayHeaders(start, end, pxPerDay), bottomHeaders: generateHourHeaders(start, end, pxPerDay) };
  }
}

/* ─────────────────────── Arrow Paths ──────────────────────────── */

interface Point {
  x: number;
  y: number;
}

function computeArrowPath(
  fromBar: BarGeometry,
  toBar: BarGeometry,
): Point[] {
  const startX = fromBar.x + fromBar.width;
  const startY = fromBar.y + fromBar.height / 2;
  const endX = toBar.x;
  const endY = toBar.y + toBar.height / 2;

  const midX = Math.max(startX + 8, endX - 8);

  return [
    { x: startX, y: startY },
    { x: midX, y: startY },
    { x: midX, y: endY },
    { x: endX, y: endY },
  ];
}

/* ─────────────────────── Exports ──────────────────────────────── */

export {
  dateToX,
  xToDate,
  isCritical,
  getZoomPixelsPerDay,
  getTimelineRange,
  computeBarGeometry,
  computeMilestoneGeometry,
  generateYearHeaders,
  generateQuarterHeaders,
  generateMonthHeaders,
  generateWeekHeaders,
  generateDayHeaders,
  generateHourHeaders,
  getHeadersForZoomLevel,
  getRowHeightPx,
  zoomIn,
  zoomOut,
  formatBarLabel,
  computeArrowPath,
  DEFAULT_GANTT_SETTINGS,
  ZOOM_ORDER,
  BAR_HEIGHT,
  MILESTONE_SIZE,
  MS_PER_DAY,
  type BarGeometry,
  type MilestoneGeometry,
  type HeaderCell,
  type Point,
};
