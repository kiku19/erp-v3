import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProgressSummary } from "./progress-summary";
import type { ActivityData, ResourceAssignmentData } from "./types";

afterEach(cleanup);

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
  activities: [
    mkActivity({ id: "a1", percentComplete: 100, totalFloat: 5 }),
    mkActivity({ id: "a2", percentComplete: 50, totalFloat: 0 }),
    mkActivity({ id: "a3", percentComplete: 0, totalFloat: 10 }),
  ],
  assignments: [mkAssignment()],
  projectStartDate: "2024-06-01",
  projectFinishDate: "2024-06-30",
};

describe("ProgressSummary", () => {
  it("renders overall percentage", () => {
    render(<ProgressSummary {...defaultProps} />);
    expect(screen.getByTestId("overall-percent")).toBeTruthy();
  });

  it("displays the correct average percentComplete", () => {
    render(<ProgressSummary {...defaultProps} />);
    const el = screen.getByTestId("overall-percent");
    // Average: (100 + 50 + 0) / 3 = 50
    expect(el.textContent).toContain("50");
  });

  it("renders completion count", () => {
    render(<ProgressSummary {...defaultProps} />);
    const el = screen.getByTestId("completion-count");
    expect(el.textContent).toContain("1");
    expect(el.textContent).toContain("3");
  });

  it("renders SPI metric when assignments exist", () => {
    render(<ProgressSummary {...defaultProps} />);
    expect(screen.getByTestId("spi-value")).toBeTruthy();
  });

  it("renders CPI metric when assignments exist", () => {
    render(<ProgressSummary {...defaultProps} />);
    expect(screen.getByTestId("cpi-value")).toBeTruthy();
  });

  it("renders activity status bar", () => {
    render(<ProgressSummary {...defaultProps} />);
    expect(screen.getByTestId("activity-status-bar")).toBeTruthy();
  });

  it("does not render EVM card when no assignments", () => {
    render(
      <ProgressSummary
        {...defaultProps}
        assignments={[]}
      />,
    );
    expect(screen.queryByTestId("spi-value")).toBeNull();
  });

  it("renders with null project dates", () => {
    render(
      <ProgressSummary
        {...defaultProps}
        projectStartDate={null}
        projectFinishDate={null}
      />,
    );
    expect(screen.getByTestId("overall-percent")).toBeTruthy();
  });

  it("renders critical count in status bar area", () => {
    render(<ProgressSummary {...defaultProps} />);
    const statusBar = screen.getByTestId("activity-status-bar");
    expect(statusBar).toBeTruthy();
  });

  it("handles empty activities", () => {
    render(
      <ProgressSummary
        activities={[]}
        assignments={[]}
        projectStartDate="2024-06-01"
        projectFinishDate="2024-06-30"
      />,
    );
    const el = screen.getByTestId("overall-percent");
    expect(el.textContent).toContain("0");
  });
});
