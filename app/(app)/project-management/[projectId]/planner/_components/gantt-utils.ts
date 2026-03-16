import type { ActivityData, GanttTimeScale } from "./types";

/* ─────────────────────── Constants ────────────────────────────── */

const MS_PER_DAY = 86_400_000;
const TIMELINE_PAD_DAYS = 14;
const BAR_HEIGHT = 16;
const MILESTONE_SIZE = 12;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/* ─────────────────────── Zoom ─────────────────────────────────── */

function getZoomPixelsPerDay(scale: GanttTimeScale): number {
  switch (scale) {
    case "day":
      return 40;
    case "week":
      return 8;
    case "month":
      return 2;
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

/* ─────────────────────── Month Headers ─────────────────────────── */

interface HeaderCell {
  label: string;
  x: number;
  width: number;
}

function generateMonthHeaders(start: Date, end: Date, pxPerDay: number): HeaderCell[] {
  const headers: HeaderCell[] = [];
  // Start from the 1st of the start month
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
  // Align to Monday of the start week
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

/* ─────────────────────── Arrow Paths ──────────────────────────── */

interface Point {
  x: number;
  y: number;
}

function computeArrowPath(
  fromBar: BarGeometry,
  toBar: BarGeometry,
): Point[] {
  // FS: arrow from end of predecessor to start of successor
  const startX = fromBar.x + fromBar.width;
  const startY = fromBar.y + fromBar.height / 2;
  const endX = toBar.x;
  const endY = toBar.y + toBar.height / 2;

  // L-shaped path: go right from fromBar, then down/up to toBar
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
  generateMonthHeaders,
  generateWeekHeaders,
  computeArrowPath,
  BAR_HEIGHT,
  MILESTONE_SIZE,
  MS_PER_DAY,
  type BarGeometry,
  type MilestoneGeometry,
  type HeaderCell,
  type Point,
};
