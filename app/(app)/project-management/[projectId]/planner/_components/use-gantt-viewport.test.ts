import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGanttViewport } from "./use-gantt-viewport";
import type { ActivityData, GanttZoomLevel } from "./types";

const mkAct = (start: string, finish: string): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 10,
  startDate: start,
  finishDate: finish,
  totalFloat: 0,
  percentComplete: 0,
  sortOrder: 0,
});

describe("useGanttViewport", () => {
  it("returns default month-week scale (8 px/day)", () => {
    const { result } = renderHook(() =>
      useGanttViewport({
        activities: [mkAct("2024-06-01", "2024-06-11")],
        projectStartDate: "2024-06-01",
        projectFinishDate: "2024-08-01",
        zoomLevel: "month-week",
      }),
    );
    expect(result.current.pxPerDay).toBe(8);
  });

  it("computes timeline range from activities", () => {
    const { result } = renderHook(() =>
      useGanttViewport({
        activities: [mkAct("2024-06-01", "2024-07-01")],
        projectStartDate: "2024-06-01",
        projectFinishDate: "2024-08-01",
        zoomLevel: "month-week",
      }),
    );
    expect(result.current.timelineStart).toBeDefined();
    expect(result.current.timelineEnd).toBeDefined();
    expect(result.current.totalWidth).toBeGreaterThan(0);
  });

  it("updates scrollLeft", () => {
    const { result } = renderHook(() =>
      useGanttViewport({
        activities: [mkAct("2024-06-01", "2024-07-01")],
        projectStartDate: "2024-06-01",
        projectFinishDate: "2024-08-01",
        zoomLevel: "month-week",
      }),
    );
    act(() => result.current.setScrollLeft(100));
    expect(result.current.scrollLeft).toBe(100);
  });

  it("changes pxPerDay when zoom level changes", () => {
    const { result, rerender } = renderHook(
      ({ zoomLevel }: { zoomLevel: GanttZoomLevel }) =>
        useGanttViewport({
          activities: [mkAct("2024-06-01", "2024-07-01")],
          projectStartDate: "2024-06-01",
          projectFinishDate: "2024-08-01",
          zoomLevel,
        }),
      { initialProps: { zoomLevel: "month-week" as GanttZoomLevel } },
    );
    expect(result.current.pxPerDay).toBe(8);
    rerender({ zoomLevel: "week-day" as GanttZoomLevel });
    expect(result.current.pxPerDay).toBe(40);
  });
});
