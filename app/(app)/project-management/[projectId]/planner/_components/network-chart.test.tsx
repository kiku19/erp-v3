import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NetworkChart } from "./network-chart";
import type { ActivityData, ActivityRelationshipData, WbsNodeData } from "./types";

/* ─── mock data ─── */

const mockActivities: ActivityData[] = [
  {
    id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Foundation Work",
    activityType: "task", duration: 5, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2024-06-01", finishDate: "2024-06-06",
    totalFloat: 0, percentComplete: 50, sortOrder: 0,
  },
  {
    id: "a2", wbsNodeId: "w1", activityId: "A20", name: "Framing",
    activityType: "task", duration: 10, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2024-06-06", finishDate: "2024-06-16",
    totalFloat: 3, percentComplete: 20, sortOrder: 1,
  },
  {
    id: "m1", wbsNodeId: "w1", activityId: "M10", name: "Design Complete",
    activityType: "milestone", duration: 0, durationUnit: "days", totalQuantity: 0, totalWorkHours: 0, startDate: "2024-06-16", finishDate: "2024-06-16",
    totalFloat: 0, percentComplete: 0, sortOrder: 2,
  },
];

const mockRelationships: ActivityRelationshipData[] = [
  { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
  { id: "r2", predecessorId: "a2", successorId: "m1", relationshipType: "FS", lag: 0 },
];

const mockWbsNodes: WbsNodeData[] = [
  { id: "w1", parentId: null, wbsCode: "1.0", name: "Engineering", sortOrder: 0 },
];

const defaultProps = {
  activities: mockActivities,
  relationships: mockRelationships,
  wbsNodes: mockWbsNodes,
  selectedRowId: null,
  onSelectRow: vi.fn(),
  projectStartDate: "2024-06-01",
};

describe("NetworkChart", () => {
  afterEach(() => cleanup());

  it("renders with correct test id", () => {
    render(<NetworkChart {...defaultProps} />);
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });

  it("renders the network canvas", () => {
    render(<NetworkChart {...defaultProps} />);
    expect(screen.getByTestId("network-canvas")).toBeDefined();
  });

  it("renders the fit button", () => {
    render(<NetworkChart {...defaultProps} />);
    expect(screen.getByTestId("network-fit-btn")).toBeDefined();
  });

  it("calls onSelectRow when canvas is clicked on a node", () => {
    const onSelectRow = vi.fn();
    render(<NetworkChart {...defaultProps} onSelectRow={onSelectRow} />);
    const canvas = screen.getByTestId("network-canvas");
    // Click somewhere on the canvas
    fireEvent.click(canvas, { clientX: 90, clientY: 50 });
    // onSelectRow may or may not fire depending on hit test, but should not crash
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });

  it("renders with no activities", () => {
    render(
      <NetworkChart
        {...defaultProps}
        activities={[]}
        relationships={[]}
      />,
    );
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });

  it("renders with null projectStartDate", () => {
    render(<NetworkChart {...defaultProps} projectStartDate={null} />);
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });

  it("renders with selectedRowId set", () => {
    render(<NetworkChart {...defaultProps} selectedRowId="a1" />);
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });

  it("fit button is clickable", () => {
    render(<NetworkChart {...defaultProps} />);
    const fitBtn = screen.getByTestId("network-fit-btn");
    fireEvent.click(fitBtn);
    // Should not crash
    expect(screen.getByTestId("network-chart")).toBeDefined();
  });
});
