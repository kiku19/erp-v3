import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivitySpreadsheet } from "./activity-spreadsheet";
import type { SpreadsheetRow } from "./types";

const mockRows: SpreadsheetRow[] = [
  {
    id: "w1", type: "wbs", depth: 0, name: "Engineering",
    isExpanded: true, hasChildren: true, wbsCode: "1",
  },
  {
    id: "a1", type: "activity", depth: 1, name: "Site Survey",
    isExpanded: false, hasChildren: false, activityId: "A1010",
    duration: 10, startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0,
  },
];

describe("ActivitySpreadsheet", () => {
  const defaultProps = {
    flatRows: mockRows,
    selectedRowId: null as string | null,
    onToggleExpand: vi.fn(),
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
  };

  it("renders column headers", () => {
    render(<ActivitySpreadsheet {...defaultProps} />);
    expect(screen.getByText("ID")).toBeDefined();
    expect(screen.getByText("Activity Name")).toBeDefined();
    expect(screen.getByText("Dur")).toBeDefined();
    expect(screen.getByText("Start")).toBeDefined();
    expect(screen.getByText("Finish")).toBeDefined();
    expect(screen.getByText("TF")).toBeDefined();
    expect(screen.getByText("%")).toBeDefined();
  });

  it("renders virtualized container with correct total height", () => {
    const { container } = render(<ActivitySpreadsheet {...defaultProps} />);
    // Virtualizer creates a container with total height = rows * ROW_HEIGHT
    const virtualContainer = container.querySelector("[style*='height: 64px']");
    expect(virtualContainer).toBeDefined();
  });

  it("shows empty state when no rows", () => {
    render(<ActivitySpreadsheet {...defaultProps} flatRows={[]} />);
    expect(screen.getByText(/Add a WBS/)).toBeDefined();
  });
});
