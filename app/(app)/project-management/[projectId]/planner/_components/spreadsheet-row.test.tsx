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

  it("calls onSelect when row is clicked (after debounce)", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(
      <SpreadsheetRowComponent
        row={activityRow}
        {...defaultProps}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Site Survey"));
    expect(onSelect).not.toHaveBeenCalled(); // not called immediately
    vi.advanceTimersByTime(200);
    expect(onSelect).toHaveBeenCalledWith("a1");
    vi.useRealTimers();
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

  it("does not call onSelect when double-clicking name (edit mode)", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(
      <SpreadsheetRowComponent
        row={activityRow}
        {...defaultProps}
        onSelect={onSelect}
      />,
    );

    const nameSpan = screen.getByText("Site Survey");
    // Simulate double-click: click fires first, then dblclick cancels the pending select
    fireEvent.click(nameSpan);
    fireEvent.doubleClick(nameSpan);
    vi.advanceTimersByTime(300);
    expect(onSelect).not.toHaveBeenCalled();
    // Should be in edit mode
    expect(screen.getByDisplayValue("Site Survey")).toBeDefined();
    vi.useRealTimers();
  });

  it("does not call onSelect when double-clicking duration (edit mode)", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(
      <SpreadsheetRowComponent
        row={activityRow}
        {...defaultProps}
        onSelect={onSelect}
      />,
    );

    const durationSpan = screen.getByText("10d");
    fireEvent.click(durationSpan);
    fireEvent.doubleClick(durationSpan);
    vi.advanceTimersByTime(300);
    expect(onSelect).not.toHaveBeenCalled();
    // Should be in edit mode
    expect(screen.getByDisplayValue("10")).toBeDefined();
    vi.useRealTimers();
  });

  it("renders a group-header row with Users icon and resource name", () => {
    const groupHeader: SpreadsheetRow = {
      id: "group-res-r1",
      type: "group-header",
      depth: 0,
      name: "Alice",
      isExpanded: true,
      hasChildren: true,
      groupKey: "r1",
    };
    render(<SpreadsheetRowComponent row={groupHeader} {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeDefined();
    // Should have bg-muted background
    const row = screen.getByTestId("spreadsheet-row-group-res-r1");
    expect(row.className).toContain("bg-muted");
  });

  it("group-header rows are not draggable", () => {
    const groupHeader: SpreadsheetRow = {
      id: "group-res-r1",
      type: "group-header",
      depth: 0,
      name: "Alice",
      isExpanded: true,
      hasChildren: true,
      groupKey: "r1",
    };
    render(<SpreadsheetRowComponent row={groupHeader} {...defaultProps} />);
    const row = screen.getByTestId("spreadsheet-row-group-res-r1");
    expect(row.getAttribute("draggable")).toBe("false");
  });

  it("group-header rows do not show duration or float", () => {
    const groupHeader: SpreadsheetRow = {
      id: "group-res-r1",
      type: "group-header",
      depth: 0,
      name: "Alice",
      isExpanded: true,
      hasChildren: true,
      groupKey: "r1",
    };
    render(<SpreadsheetRowComponent row={groupHeader} {...defaultProps} />);
    // No "0d" or "0%" should appear
    expect(screen.queryByText(/\dd$/)).toBeNull();
    expect(screen.queryByText(/%$/)).toBeNull();
  });
});
