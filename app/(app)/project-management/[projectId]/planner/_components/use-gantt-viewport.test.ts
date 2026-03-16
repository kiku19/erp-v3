import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGanttViewport } from "./use-gantt-viewport";
import type { ActivityData } from "./types";

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
  it("returns default week scale", () => {
    const { result } = renderHook(() =>
      useGanttViewport({
        activities: [mkAct("2024-06-01", "2024-06-11")],
        projectStartDate: "2024-06-01",
        projectFinishDate: "2024-08-01",
        timeScale: "week",
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
        timeScale: "week",
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
        timeScale: "week",
      }),
    );
    act(() => result.current.setScrollLeft(100));
    expect(result.current.scrollLeft).toBe(100);
  });

  it("changes pxPerDay when scale changes", () => {
    const { result, rerender } = renderHook(
      ({ scale }) =>
        useGanttViewport({
          activities: [mkAct("2024-06-01", "2024-07-01")],
          projectStartDate: "2024-06-01",
          projectFinishDate: "2024-08-01",
          timeScale: scale,
        }),
      { initialProps: { scale: "week" as const } },
    );
    expect(result.current.pxPerDay).toBe(8);
    rerender({ scale: "day" as const });
    expect(result.current.pxPerDay).toBe(40);
  });
});
