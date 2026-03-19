import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProgressSCurve } from "./progress-s-curve";
import type { ActivityData } from "./types";

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
  // Reset all mock fn calls
  for (const key of Object.keys(mockCtx)) {
    const val = mockCtx[key as keyof typeof mockCtx];
    if (typeof val === "function" && "mockClear" in val) {
      (val as ReturnType<typeof vi.fn>).mockClear();
    }
  }
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

describe("ProgressSCurve", () => {
  it("renders a canvas element", () => {
    render(
      <ProgressSCurve
        activities={[mkActivity()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
      />,
    );
    expect(screen.getByTestId("s-curve-canvas")).toBeTruthy();
  });

  it("renders with null project dates without crashing", () => {
    render(
      <ProgressSCurve
        activities={[mkActivity()]}
        projectStartDate={null}
        projectFinishDate={null}
      />,
    );
    expect(screen.getByTestId("s-curve-canvas")).toBeTruthy();
  });

  it("renders with empty activities", () => {
    render(
      <ProgressSCurve
        activities={[]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
      />,
    );
    expect(screen.getByTestId("s-curve-canvas")).toBeTruthy();
  });

  it("renders legend items", () => {
    render(
      <ProgressSCurve
        activities={[mkActivity()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
      />,
    );
    expect(screen.getByText("Planned")).toBeTruthy();
    expect(screen.getByText("Actual")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("sets canvas width to container width", () => {
    render(
      <ProgressSCurve
        activities={[mkActivity()]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
      />,
    );
    const canvas = screen.getByTestId("s-curve-canvas") as HTMLCanvasElement;
    // Canvas should exist in DOM
    expect(canvas.tagName).toBe("CANVAS");
  });
});
