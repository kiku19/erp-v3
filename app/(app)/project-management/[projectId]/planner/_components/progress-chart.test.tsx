import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProgressChart } from "./progress-chart";
import type { ActivityData, WbsNodeData, ResourceData, ResourceAssignmentData } from "./types";

afterEach(cleanup);

/* ─── Mock ResizeObserver ─── */

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

/* ─── Mock canvas ─── */

const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  setLineDash: vi.fn(),
  closePath: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  measureText: vi.fn(() => ({ width: 30 })),
  font: "",
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  globalAlpha: 1,
  textAlign: "left" as CanvasTextAlign,
  textBaseline: "top" as CanvasTextBaseline,
  canvas: { width: 800, height: 400 },
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
});

/* ─── helpers ─── */

const mkActivity = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 10,
  durationUnit: "days",
  totalQuantity: 0,
  totalWorkHours: 0,
  startDate: "2024-06-01",
  finishDate: "2024-06-11",
  totalFloat: 5,
  percentComplete: 50,
  sortOrder: 0,
  ...overrides,
});

const mkWbs = (overrides: Partial<WbsNodeData> = {}): WbsNodeData => ({
  id: "w1",
  parentId: null,
  wbsCode: "1",
  name: "WBS 1",
  sortOrder: 0,
  ...overrides,
});

const mkResource = (overrides: Partial<ResourceData> = {}): ResourceData => ({
  id: "r1",
  name: "Worker",
  resourceType: "labor",
  maxUnitsPerDay: 8,
  costPerUnit: 50,
  sortOrder: 0,
  ...overrides,
});

const mkAssignment = (overrides: Partial<ResourceAssignmentData> = {}): ResourceAssignmentData => ({
  id: "ra1",
  activityId: "a1",
  resourceId: "r1",
  unitsPerDay: 1,
  budgetedCost: 1000,
  actualCost: 500,
  ...overrides,
});

const defaultProps = {
  activities: [mkActivity()],
  wbsNodes: [mkWbs()],
  resources: [mkResource()],
  assignments: [mkAssignment()],
  projectStartDate: "2024-06-01",
  projectFinishDate: "2024-06-30",
  timeScale: "month" as const,
};

describe("ProgressChart", () => {
  it("renders the summary section", () => {
    render(<ProgressChart {...defaultProps} />);
    expect(screen.getByTestId("overall-percent")).toBeTruthy();
  });

  it("renders the S-curve canvas", () => {
    render(<ProgressChart {...defaultProps} />);
    expect(screen.getByTestId("s-curve-canvas")).toBeTruthy();
  });

  it("renders completion count", () => {
    render(<ProgressChart {...defaultProps} />);
    expect(screen.getByTestId("completion-count")).toBeTruthy();
  });

  it("renders with empty data", () => {
    render(
      <ProgressChart
        activities={[]}
        wbsNodes={[]}
        resources={[]}
        assignments={[]}
        projectStartDate={null}
        projectFinishDate={null}
        timeScale="month"
      />,
    );
    expect(screen.getByTestId("overall-percent")).toBeTruthy();
    expect(screen.getByTestId("s-curve-canvas")).toBeTruthy();
  });

  it("renders with multiple activities", () => {
    const activities = [
      mkActivity({ id: "a1", percentComplete: 100 }),
      mkActivity({ id: "a2", percentComplete: 50 }),
      mkActivity({ id: "a3", percentComplete: 0, totalFloat: -2 }),
    ];
    render(<ProgressChart {...defaultProps} activities={activities} />);
    expect(screen.getByTestId("activity-status-bar")).toBeTruthy();
  });

  it("renders the container with full width", () => {
    const { container } = render(<ProgressChart {...defaultProps} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).toContain("flex-col");
  });
});
