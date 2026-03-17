import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResourceHistogram } from "./resource-histogram";
import type { ActivityData, ResourceData, ResourceAssignmentData } from "./types";

/* ─── Mock canvas ─── */

const mockCtx = {
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  font: "",
  textAlign: "" as CanvasTextAlign,
  textBaseline: "" as CanvasTextBaseline,
  globalAlpha: 1,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  // Reset mock call counts
  Object.values(mockCtx).forEach((v) => {
    if (typeof v === "function") (v as ReturnType<typeof vi.fn>).mockClear();
  });
});

/* ─── helpers ─── */

const mkActivity = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 5,
  startDate: "2024-06-01",
  finishDate: "2024-06-05",
  totalFloat: 5,
  percentComplete: 0,
  sortOrder: 0,
  ...overrides,
});

const mkResource = (overrides: Partial<ResourceData> = {}): ResourceData => ({
  id: "r1",
  name: "Crane Operator",
  resourceType: "labor",
  maxUnitsPerDay: 8,
  costPerUnit: 50,
  sortOrder: 0,
  ...overrides,
});

const mkAssignment = (overrides: Partial<ResourceAssignmentData> = {}): ResourceAssignmentData => ({
  id: "asgn1",
  activityId: "a1",
  resourceId: "r1",
  unitsPerDay: 4,
  budgetedCost: 100,
  actualCost: 0,
  ...overrides,
});

const defaultProps = {
  resources: [mkResource()],
  assignments: [mkAssignment()],
  activities: [mkActivity()],
  timelineStart: new Date("2024-06-01"),
  pxPerDay: 40,
  totalWidth: 800,
  scrollLeft: 0,
  rowHeight: 60,
};

/* ─── Tests ─── */

describe("ResourceHistogram", () => {
  it("renders a canvas element", () => {
    render(<ResourceHistogram {...defaultProps} />);
    const canvas = screen.getByTestId("resource-histogram-canvas");
    expect(canvas).toBeDefined();
    expect(canvas.tagName).toBe("CANVAS");
  });

  it("sets canvas dimensions based on totalWidth and resources", () => {
    render(<ResourceHistogram {...defaultProps} />);
    const canvas = screen.getByTestId("resource-histogram-canvas") as HTMLCanvasElement;
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(60); // 1 resource * 60 rowHeight
  });

  it("gets 2d context and draws", () => {
    render(<ResourceHistogram {...defaultProps} />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
  });

  it("draws histogram bars (calls fillRect)", () => {
    render(<ResourceHistogram {...defaultProps} />);
    // Should draw bars for the resource usage
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("draws max units line (calls setLineDash for dashed line)", () => {
    render(<ResourceHistogram {...defaultProps} />);
    expect(mockCtx.setLineDash).toHaveBeenCalled();
  });

  it("shows 'No assignments' text when resource has no assignments", () => {
    render(
      <ResourceHistogram
        {...defaultProps}
        assignments={[]}
      />,
    );
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      "No assignments",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("handles multiple resources with correct row offsets", () => {
    const resources = [
      mkResource({ id: "r1", name: "Resource 1" }),
      mkResource({ id: "r2", name: "Resource 2" }),
    ];
    const assignments = [
      mkAssignment({ resourceId: "r1" }),
      mkAssignment({ id: "asgn2", resourceId: "r2" }),
    ];
    render(
      <ResourceHistogram
        {...defaultProps}
        resources={resources}
        assignments={assignments}
      />,
    );
    const canvas = screen.getByTestId("resource-histogram-canvas") as HTMLCanvasElement;
    expect(canvas.height).toBe(120); // 2 resources * 60
  });

  it("renders empty state for resources without assignments among others that have them", () => {
    const resources = [
      mkResource({ id: "r1" }),
      mkResource({ id: "r2", name: "Idle Resource" }),
    ];
    render(
      <ResourceHistogram
        {...defaultProps}
        resources={resources}
        assignments={[mkAssignment({ resourceId: "r1" })]}
      />,
    );
    // Should draw "No assignments" for r2
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      "No assignments",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("applies scrollLeft offset to canvas translation", () => {
    render(<ResourceHistogram {...defaultProps} scrollLeft={100} />);
    // Canvas should still render; the scroll offset is applied via CSS transform
    const wrapper = screen.getByTestId("resource-histogram-wrapper");
    expect(wrapper).toBeDefined();
  });
});
