import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GanttTimeAxis } from "./gantt-time-axis";

describe("GanttTimeAxis", () => {
  afterEach(() => cleanup());

  it("renders month/week headers for month-week zoom level", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-01")}
        timelineEnd={new Date("2024-08-31")}
        pxPerDay={8}
        scrollLeft={0}
        zoomLevel="month-week"
      />,
    );
    expect(screen.getByText("Jun 2024")).toBeDefined();
    expect(screen.getByText("Jul 2024")).toBeDefined();
    expect(screen.getByText("W1")).toBeDefined();
  });

  it("renders year/quarter headers for year-quarter zoom level", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-01-01")}
        timelineEnd={new Date("2024-12-31")}
        pxPerDay={0.5}
        scrollLeft={0}
        zoomLevel="year-quarter"
      />,
    );
    expect(screen.getByText("2024")).toBeDefined();
    expect(screen.getByText("Q1 2024")).toBeDefined();
  });

  it("renders week/day headers for week-day zoom level", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-03")}
        timelineEnd={new Date("2024-06-09")}
        pxPerDay={40}
        scrollLeft={0}
        zoomLevel="week-day"
      />,
    );
    expect(screen.getByText("W1")).toBeDefined();
    expect(screen.getByText("Mon 3")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-01")}
        timelineEnd={new Date("2024-06-30")}
        pxPerDay={8}
        scrollLeft={0}
        zoomLevel="month-week"
      />,
    );
    expect(screen.getByTestId("gantt-time-axis")).toBeDefined();
  });
});
