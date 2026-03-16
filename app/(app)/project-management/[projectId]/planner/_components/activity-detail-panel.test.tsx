import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActivityDetailPanel } from "./activity-detail-panel";
import type { SpreadsheetRow, ActivityData, WbsNodeData, ActivityRelationshipData, DetailTab } from "./types";

const mockActivity: SpreadsheetRow = {
  id: "act-1",
  type: "activity",
  depth: 2,
  name: "Excavation & Grading",
  isExpanded: false,
  hasChildren: false,
  activityId: "A3010",
  duration: 25,
  startDate: "2024-04-15",
  finishDate: "2024-05-20",
  totalFloat: 5,
  percentComplete: 64,
  predecessors: "A10, A20",
};

const mockActivities: ActivityData[] = [
  { id: "act-1", wbsNodeId: "w1", activityId: "A3010", name: "Excavation & Grading", activityType: "task", duration: 25, startDate: "2024-04-15", finishDate: "2024-05-20", totalFloat: 5, percentComplete: 64, sortOrder: 0 },
];

const mockWbsNodes: WbsNodeData[] = [
  { id: "w1", parentId: null, wbsCode: "3.0", name: "Construction", sortOrder: 0 },
];

const mockRelationships: ActivityRelationshipData[] = [];

const defaultProps = {
  activity: mockActivity,
  activities: mockActivities,
  wbsNodes: mockWbsNodes,
  relationships: mockRelationships,
  onClose: vi.fn(),
  onUpdate: vi.fn(),
  onExpandToggle: vi.fn(),
  onOpenCalendarSettings: vi.fn(),
  onOpenObs: vi.fn(),
  activeTab: "general" as DetailTab,
  onTabChange: vi.fn(),
};

describe("ActivityDetailPanel", () => {
  afterEach(() => cleanup());

  it("renders the activity name in header", () => {
    render(<ActivityDetailPanel {...defaultProps} />);
    expect(screen.getByText("A3010 — Excavation & Grading")).toBeDefined();
  });

  it("renders status badge in header", () => {
    render(<ActivityDetailPanel {...defaultProps} />);
    const badges = screen.getAllByText("In Progress");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all tab labels", () => {
    render(<ActivityDetailPanel {...defaultProps} />);
    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByText("Predecessors")).toBeDefined();
    expect(screen.getByText("Successors")).toBeDefined();
    expect(screen.getByText("Resources")).toBeDefined();
    expect(screen.getByText("Codes")).toBeDefined();
    expect(screen.getByText("Notebook")).toBeDefined();
    expect(screen.getByText("Steps")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<ActivityDetailPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("detail-close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onExpandToggle when expand button is clicked", () => {
    const onExpandToggle = vi.fn();
    render(<ActivityDetailPanel {...defaultProps} onExpandToggle={onExpandToggle} />);
    fireEvent.click(screen.getByTestId("detail-expand-btn"));
    expect(onExpandToggle).toHaveBeenCalledOnce();
  });

  it("calls onOpenCalendarSettings when calendar button is clicked", () => {
    const onOpenCalendarSettings = vi.fn();
    render(<ActivityDetailPanel {...defaultProps} onOpenCalendarSettings={onOpenCalendarSettings} />);
    fireEvent.click(screen.getByTestId("detail-calendar-btn"));
    expect(onOpenCalendarSettings).toHaveBeenCalledOnce();
  });

  it("calls onOpenObs when OBS button is clicked", () => {
    const onOpenObs = vi.fn();
    render(<ActivityDetailPanel {...defaultProps} onOpenObs={onOpenObs} />);
    fireEvent.click(screen.getByTestId("detail-obs-btn"));
    expect(onOpenObs).toHaveBeenCalledOnce();
  });

  it("shows general tab content by default", () => {
    render(<ActivityDetailPanel {...defaultProps} />);
    expect(screen.getByTestId("general-tab")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<ActivityDetailPanel {...defaultProps} />);
    expect(screen.getByTestId("activity-detail-panel")).toBeDefined();
  });
});
