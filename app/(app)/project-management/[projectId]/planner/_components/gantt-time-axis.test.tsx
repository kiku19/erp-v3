import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GanttTimeAxis } from "./gantt-time-axis";

describe("GanttTimeAxis", () => {
  afterEach(() => cleanup());

  it("renders month labels", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-01")}
        timelineEnd={new Date("2024-08-31")}
        pxPerDay={8}
        scrollLeft={0}
      />,
    );
    expect(screen.getByText("Jun 2024")).toBeDefined();
    expect(screen.getByText("Jul 2024")).toBeDefined();
  });

  it("renders week labels", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-01")}
        timelineEnd={new Date("2024-06-30")}
        pxPerDay={8}
        scrollLeft={0}
      />,
    );
    expect(screen.getByText("W1")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(
      <GanttTimeAxis
        timelineStart={new Date("2024-06-01")}
        timelineEnd={new Date("2024-06-30")}
        pxPerDay={8}
        scrollLeft={0}
      />,
    );
    expect(screen.getByTestId("gantt-time-axis")).toBeDefined();
  });
});
