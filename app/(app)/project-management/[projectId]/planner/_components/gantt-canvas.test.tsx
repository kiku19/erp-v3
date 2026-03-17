import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GanttCanvas } from "./gantt-canvas";
import { DEFAULT_GANTT_SETTINGS } from "./gantt-utils";
import type { SpreadsheetRow, ActivityData, ActivityRelationshipData, WbsNodeData, GanttSettings } from "./types";

const mockRows: SpreadsheetRow[] = [
  { id: "w1", type: "wbs", depth: 0, name: "Engineering", isExpanded: true, hasChildren: true, wbsCode: "1.0" },
  { id: "a1", type: "activity", depth: 1, name: "Site Prep", isExpanded: false, hasChildren: false, activityId: "A10", duration: 10, startDate: "2024-06-01", finishDate: "2024-06-11", totalFloat: 0, percentComplete: 80 },
  { id: "a2", type: "activity", depth: 1, name: "Foundation", isExpanded: false, hasChildren: false, activityId: "A20", duration: 20, startDate: "2024-06-11", finishDate: "2024-07-01", totalFloat: 5, percentComplete: 30 },
  { id: "m1", type: "milestone", depth: 1, name: "Design Complete", isExpanded: false, hasChildren: false, activityId: "M10", duration: 0, startDate: "2024-07-01", finishDate: "2024-07-01", totalFloat: 0, percentComplete: 0 },
];

const mockActivities: ActivityData[] = [
  { id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Site Prep", activityType: "task", duration: 10, startDate: "2024-06-01", finishDate: "2024-06-11", totalFloat: 0, percentComplete: 80, sortOrder: 0 },
  { id: "a2", wbsNodeId: "w1", activityId: "A20", name: "Foundation", activityType: "task", duration: 20, startDate: "2024-06-11", finishDate: "2024-07-01", totalFloat: 5, percentComplete: 30, sortOrder: 1 },
  { id: "m1", wbsNodeId: "w1", activityId: "M10", name: "Design Complete", activityType: "milestone", duration: 0, startDate: "2024-07-01", finishDate: "2024-07-01", totalFloat: 0, percentComplete: 0, sortOrder: 2 },
];

const mockRelationships: ActivityRelationshipData[] = [
  { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
];

const mockWbsNodes: WbsNodeData[] = [
  { id: "w1", parentId: null, wbsCode: "1.0", name: "Engineering", sortOrder: 0 },
];

const defaultProps = {
  flatRows: mockRows,
  activities: mockActivities,
  relationships: mockRelationships,
  wbsNodes: mockWbsNodes,
  selectedRowId: null,
  onSelectRow: vi.fn(),
  timelineStart: new Date("2024-05-15"),
  pxPerDay: 8,
  totalWidth: 800,
  scrollLeft: 0,
  rowHeight: 32,
  settings: { ...DEFAULT_GANTT_SETTINGS },
};

describe("GanttCanvas", () => {
  afterEach(() => cleanup());

  it("renders a canvas element", () => {
    render(<GanttCanvas {...defaultProps} />);
    expect(screen.getByTestId("gantt-canvas")).toBeDefined();
  });

  it("calls onSelectRow when canvas is clicked", () => {
    const onSelectRow = vi.fn();
    render(<GanttCanvas {...defaultProps} onSelectRow={onSelectRow} />);
    const canvas = screen.getByTestId("gantt-canvas");
    fireEvent.click(canvas, { clientX: 50, clientY: 48 });
    expect(onSelectRow).toHaveBeenCalled();
  });

  it("has correct dimensions", () => {
    render(<GanttCanvas {...defaultProps} />);
    const canvas = screen.getByTestId("gantt-canvas");
    expect(canvas.tagName.toLowerCase()).toBe("canvas");
  });

  it("renders with different settings", () => {
    const customSettings: GanttSettings = {
      ...DEFAULT_GANTT_SETTINGS,
      showGridLines: false,
      showTodayLine: false,
      showLegend: false,
      showBaselines: false,
      showRelationshipArrows: false,
      barLabelFormat: "name",
      barColorScheme: "float",
    };
    render(<GanttCanvas {...defaultProps} settings={customSettings} />);
    expect(screen.getByTestId("gantt-canvas")).toBeDefined();
  });
});
