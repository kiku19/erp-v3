import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GanttChart } from "./gantt-chart";
import type { SpreadsheetRow, ActivityData, ActivityRelationshipData, WbsNodeData } from "./types";

const mockRows: SpreadsheetRow[] = [
  { id: "a1", type: "activity", depth: 1, name: "Task 1", isExpanded: false, hasChildren: false, activityId: "A10", duration: 10, startDate: "2024-06-01", finishDate: "2024-06-11", totalFloat: 0, percentComplete: 50 },
];

const mockActivities: ActivityData[] = [
  { id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Task 1", activityType: "task", duration: 10, startDate: "2024-06-01", finishDate: "2024-06-11", totalFloat: 0, percentComplete: 50, sortOrder: 0 },
];

const defaultProps = {
  flatRows: mockRows,
  activities: mockActivities,
  relationships: [] as ActivityRelationshipData[],
  wbsNodes: [] as WbsNodeData[],
  selectedRowId: null,
  onSelectRow: vi.fn(),
  projectStartDate: "2024-06-01",
  projectFinishDate: "2024-08-01",
  timeScale: "week" as const,
};

describe("GanttChart", () => {
  afterEach(() => cleanup());

  it("renders the time axis", () => {
    render(<GanttChart {...defaultProps} />);
    expect(screen.getByTestId("gantt-time-axis")).toBeDefined();
  });

  it("renders the canvas", () => {
    render(<GanttChart {...defaultProps} />);
    expect(screen.getByTestId("gantt-canvas")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<GanttChart {...defaultProps} />);
    expect(screen.getByTestId("gantt-chart")).toBeDefined();
  });
});
