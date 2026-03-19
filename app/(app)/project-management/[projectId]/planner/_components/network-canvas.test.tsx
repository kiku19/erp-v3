import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NetworkCanvas } from "./network-canvas";
import type { ActivityData, ActivityRelationshipData } from "./types";

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

const mockNodePositions = new Map([
  ["a1", { x: 0, y: 0 }],
  ["a2", { x: 300, y: 0 }],
  ["m1", { x: 600, y: 0 }],
]);

const mockForwardResults = new Map([
  ["a1", { startDate: "2024-06-01T00:00:00.000Z", finishDate: "2024-06-06T00:00:00.000Z" }],
  ["a2", { startDate: "2024-06-06T00:00:00.000Z", finishDate: "2024-06-16T00:00:00.000Z" }],
  ["m1", { startDate: "2024-06-16T00:00:00.000Z", finishDate: "2024-06-16T00:00:00.000Z" }],
]);

const mockBackwardResults = new Map([
  ["a1", { lateStart: "2024-06-01T00:00:00.000Z", lateFinish: "2024-06-06T00:00:00.000Z", totalFloat: 0 }],
  ["a2", { lateStart: "2024-06-06T00:00:00.000Z", lateFinish: "2024-06-16T00:00:00.000Z", totalFloat: 3 }],
  ["m1", { lateStart: "2024-06-16T00:00:00.000Z", lateFinish: "2024-06-16T00:00:00.000Z", totalFloat: 0 }],
]);

const defaultProps = {
  activities: mockActivities,
  relationships: mockRelationships,
  nodePositions: mockNodePositions,
  forwardResults: mockForwardResults,
  backwardResults: mockBackwardResults,
  selectedRowId: null,
  panX: 0,
  panY: 0,
  zoom: 1,
  onMouseDown: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseUp: vi.fn(),
  onWheel: vi.fn(),
  onClick: vi.fn(),
};

describe("NetworkCanvas", () => {
  afterEach(() => cleanup());

  it("renders a canvas element with correct test id", () => {
    render(<NetworkCanvas {...defaultProps} />);
    expect(screen.getByTestId("network-canvas")).toBeDefined();
    expect(screen.getByTestId("network-canvas").tagName.toLowerCase()).toBe("canvas");
  });

  it("fires onMouseDown when canvas is clicked", () => {
    const onMouseDown = vi.fn();
    render(<NetworkCanvas {...defaultProps} onMouseDown={onMouseDown} />);
    const canvas = screen.getByTestId("network-canvas");
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
    expect(onMouseDown).toHaveBeenCalled();
  });

  it("fires onMouseMove when mouse moves over canvas", () => {
    const onMouseMove = vi.fn();
    render(<NetworkCanvas {...defaultProps} onMouseMove={onMouseMove} />);
    const canvas = screen.getByTestId("network-canvas");
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
    expect(onMouseMove).toHaveBeenCalled();
  });

  it("fires onMouseUp when mouse is released", () => {
    const onMouseUp = vi.fn();
    render(<NetworkCanvas {...defaultProps} onMouseUp={onMouseUp} />);
    const canvas = screen.getByTestId("network-canvas");
    fireEvent.mouseUp(canvas);
    expect(onMouseUp).toHaveBeenCalled();
  });

  it("fires onClick when canvas is clicked", () => {
    const onClick = vi.fn();
    render(<NetworkCanvas {...defaultProps} onClick={onClick} />);
    const canvas = screen.getByTestId("network-canvas");
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    expect(onClick).toHaveBeenCalled();
  });

  it("renders with selectedRowId highlighting", () => {
    render(<NetworkCanvas {...defaultProps} selectedRowId="a1" />);
    expect(screen.getByTestId("network-canvas")).toBeDefined();
  });

  it("renders with zoom and pan applied", () => {
    render(<NetworkCanvas {...defaultProps} panX={50} panY={30} zoom={1.5} />);
    expect(screen.getByTestId("network-canvas")).toBeDefined();
  });

  it("renders with no activities", () => {
    render(
      <NetworkCanvas
        {...defaultProps}
        activities={[]}
        relationships={[]}
        nodePositions={new Map()}
        forwardResults={new Map()}
        backwardResults={new Map()}
      />,
    );
    expect(screen.getByTestId("network-canvas")).toBeDefined();
  });

  it("renders milestone nodes", () => {
    // Includes m1 as a milestone — just verifying it doesn't crash
    render(<NetworkCanvas {...defaultProps} />);
    expect(screen.getByTestId("network-canvas")).toBeDefined();
  });
});
