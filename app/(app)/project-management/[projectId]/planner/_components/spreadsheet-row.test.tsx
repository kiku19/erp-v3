import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SpreadsheetRowComponent } from "./spreadsheet-row";
import type { SpreadsheetRow } from "./types";

const wbsRow: SpreadsheetRow = {
  id: "w1",
  type: "wbs",
  depth: 0,
  name: "Engineering",
  isExpanded: true,
  hasChildren: true,
  wbsCode: "1",
};

const activityRow: SpreadsheetRow = {
  id: "a1",
  type: "activity",
  depth: 1,
  name: "Site Survey",
  isExpanded: false,
  hasChildren: false,
  activityId: "A1010",
  duration: 10,
  startDate: "2026-01-01T00:00:00.000Z",
  finishDate: "2026-01-15T00:00:00.000Z",
  totalFloat: 5,
  percentComplete: 30,
};

const milestoneRow: SpreadsheetRow = {
  id: "m1",
  type: "milestone",
  depth: 1,
  name: "Engineering Complete",
  isExpanded: false,
  hasChildren: false,
  activityId: "M1001",
  duration: 0,
  startDate: "2026-03-01T00:00:00.000Z",
  finishDate: "2026-03-01T00:00:00.000Z",
  totalFloat: 0,
  percentComplete: 0,
};

describe("SpreadsheetRowComponent", () => {
  afterEach(() => cleanup());

  const defaultProps = {
    onToggleExpand: vi.fn(),
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    isSelected: false,
  };

  it("renders a WBS row with wbsCode and name", () => {
    render(<SpreadsheetRowComponent row={wbsRow} {...defaultProps} />);
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("Engineering")).toBeDefined();
  });

  it("renders an activity row with activityId, name, and duration", () => {
    render(<SpreadsheetRowComponent row={activityRow} {...defaultProps} />);
    expect(screen.getByText("A1010")).toBeDefined();
    expect(screen.getByText("Site Survey")).toBeDefined();
    expect(screen.getByText("10d")).toBeDefined();
  });

  it("renders a milestone row with 0d duration", () => {
    render(<SpreadsheetRowComponent row={milestoneRow} {...defaultProps} />);
    expect(screen.getByText("M1001")).toBeDefined();
    expect(screen.getByText("0d")).toBeDefined();
  });

  it("calls onToggleExpand when WBS chevron is clicked", () => {
    const onToggleExpand = vi.fn();
    render(
      <SpreadsheetRowComponent
        row={wbsRow}
        {...defaultProps}
        onToggleExpand={onToggleExpand}
      />,
    );

    const chevron = screen.getByTestId("expand-toggle");
    fireEvent.click(chevron);
    expect(onToggleExpand).toHaveBeenCalledWith("w1");
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SpreadsheetRowComponent
        row={activityRow}
        {...defaultProps}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Site Survey"));
    expect(onSelect).toHaveBeenCalledWith("a1");
  });

  it("applies selected styles when isSelected is true", () => {
    const { container } = render(
      <SpreadsheetRowComponent
        row={activityRow}
        {...defaultProps}
        isSelected={true}
      />,
    );

    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain("ring");
  });

  it("indents based on depth", () => {
    render(<SpreadsheetRowComponent row={activityRow} {...defaultProps} />);

    const nameCell = screen.getByTestId("name-cell");
    expect(nameCell.style.paddingLeft).toBe("20px");
  });

  it("shows chevron for WBS with children, no chevron for activities", () => {
    const { rerender } = render(
      <SpreadsheetRowComponent row={wbsRow} {...defaultProps} />,
    );
    expect(screen.getByTestId("expand-toggle")).toBeDefined();

    rerender(
      <SpreadsheetRowComponent row={activityRow} {...defaultProps} />,
    );
    expect(screen.queryByTestId("expand-toggle")).toBeNull();
  });

  it("formats dates for display", () => {
    render(<SpreadsheetRowComponent row={activityRow} {...defaultProps} />);
    expect(screen.getByText("01-Jan-26")).toBeDefined();
    expect(screen.getByText("15-Jan-26")).toBeDefined();
  });

  it("shows percentage", () => {
    render(<SpreadsheetRowComponent row={activityRow} {...defaultProps} />);
    expect(screen.getByText("30%")).toBeDefined();
  });
});
