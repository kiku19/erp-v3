import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActivityDetailModal } from "./activity-detail-modal";
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
};

const defaultProps = {
  open: true,
  activity: mockActivity,
  activities: [] as ActivityData[],
  wbsNodes: [] as WbsNodeData[],
  relationships: [] as ActivityRelationshipData[],
  onClose: vi.fn(),
  onUpdate: vi.fn(),
  onOpenCalendarSettings: vi.fn(),
  onOpenObs: vi.fn(),
  calendars: [],
  defaultCalendarId: null,
  activeTab: "general" as DetailTab,
  onTabChange: vi.fn(),
};

describe("ActivityDetailModal", () => {
  afterEach(() => cleanup());

  it("renders modal with activity name when open", () => {
    render(<ActivityDetailModal {...defaultProps} />);
    expect(screen.getByText("A3010 — Excavation & Grading")).toBeDefined();
  });

  it("renders nothing when open is false", () => {
    render(<ActivityDetailModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId("activity-detail-modal")).toBeNull();
  });

  it("renders all tab labels", () => {
    render(<ActivityDetailModal {...defaultProps} />);
    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByText("Relationships")).toBeDefined();
    expect(screen.getByText("Resources")).toBeDefined();
    expect(screen.getByText("Codes")).toBeDefined();
    expect(screen.getByText("Notebook")).toBeDefined();
    expect(screen.getByText("Steps")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<ActivityDetailModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("modal-detail-close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
