import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ResourceChart } from "./resource-chart";
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
  durationUnit: "days",
  totalQuantity: 0,
  totalWorkHours: 0,
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

/* ─── Tests ─── */

describe("ResourceChart", () => {
  it("renders empty state when no resources", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[]}
        assignments={[]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    expect(screen.getByText(/No resources yet/)).toBeDefined();
    expect(screen.getByRole("button", { name: /add resource/i })).toBeDefined();
  });

  it("renders resource sidebar and histogram when resources exist", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    expect(screen.getByTestId("resource-sidebar")).toBeDefined();
    expect(screen.getByTestId("resource-histogram-wrapper")).toBeDefined();
  });

  it("renders the chart container", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    expect(screen.getByTestId("resource-chart")).toBeDefined();
  });

  it("renders timeline header area", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    expect(screen.getByTestId("resource-timeline-header")).toBeDefined();
  });

  it("highlights selected resource row", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[
          mkResource({ id: "r1", name: "Resource A" }),
          mkResource({ id: "r2", name: "Resource B", sortOrder: 1 }),
        ]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    // Click first resource
    fireEvent.click(screen.getByTestId("resource-row-r1"));
    const row = screen.getByTestId("resource-row-r1");
    expect(row.className).toContain("bg-muted");
  });

  it("renders with multiple resources", () => {
    const resources = [
      mkResource({ id: "r1", name: "Labor 1" }),
      mkResource({ id: "r2", name: "Equipment 1", resourceType: "equipment", sortOrder: 1 }),
      mkResource({ id: "r3", name: "Material 1", resourceType: "material", sortOrder: 2 }),
    ];
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={resources}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="day"
      />,
    );
    expect(screen.getByText("Labor 1")).toBeDefined();
    expect(screen.getByText("Equipment 1")).toBeDefined();
    expect(screen.getByText("Material 1")).toBeDefined();
  });

  it("handles null project dates gracefully", () => {
    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate={null}
        projectFinishDate={null}
        timeScale="day"
      />,
    );
    // Should render without crashing
    expect(screen.getByTestId("resource-chart")).toBeDefined();
  });

  it("supports different time scales", () => {
    const { unmount } = render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="week"
      />,
    );
    expect(screen.getByTestId("resource-chart")).toBeDefined();
    unmount();

    render(
      <ResourceChart
        activities={[mkActivity()]}
        resources={[mkResource()]}
        assignments={[mkAssignment()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
        timeScale="month"
      />,
    );
    expect(screen.getByTestId("resource-chart")).toBeDefined();
  });
});
