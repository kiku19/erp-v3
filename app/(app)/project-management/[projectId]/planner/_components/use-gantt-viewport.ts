import { useState, useMemo } from "react";
import { getZoomPixelsPerDay, getTimelineRange, MS_PER_DAY } from "./gantt-utils";
import type { ActivityData, GanttZoomLevel } from "./types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface UseGanttViewportProps {
  activities: ActivityData[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
  zoomLevel: GanttZoomLevel;
}

/* ─────────────────────── Hook ──────────────────────────────────── */

function useGanttViewport({ activities, projectStartDate, projectFinishDate, zoomLevel }: UseGanttViewportProps) {
  const [scrollLeft, setScrollLeft] = useState(0);

  const pxPerDay = getZoomPixelsPerDay(zoomLevel);

  const { timelineStart, timelineEnd } = useMemo(() => {
    const range = getTimelineRange(activities, projectStartDate, projectFinishDate);
    return { timelineStart: range.start, timelineEnd: range.end };
  }, [activities, projectStartDate, projectFinishDate]);

  const totalWidth = useMemo(() => {
    const diffMs = timelineEnd.getTime() - timelineStart.getTime();
    const days = diffMs / MS_PER_DAY;
    return Math.ceil(days * pxPerDay);
  }, [timelineStart, timelineEnd, pxPerDay]);

  return {
    pxPerDay,
    timelineStart,
    timelineEnd,
    totalWidth,
    scrollLeft,
    setScrollLeft,
  };
}

export { useGanttViewport };
export type { UseGanttViewportProps };
