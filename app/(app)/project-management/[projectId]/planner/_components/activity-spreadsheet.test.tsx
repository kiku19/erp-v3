import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("calls onSort when a column header is clicked", () => {
    const onSort = vi.fn();
    const { container } = render(<ActivitySpreadsheet {...defaultProps} onSort={onSort} />);
    const header = container.querySelector("[data-testid='col-header-id']") as HTMLElement;
    fireEvent.click(header);
    expect(onSort).toHaveBeenCalledWith("id");
  });

  it("does NOT call onSort after a column resize drag", () => {
    const onSort = vi.fn();
    const { container } = render(<ActivitySpreadsheet {...defaultProps} onSort={onSort} />);

    const resizeHandle = container.querySelector("[data-testid='col-resize-name']") as HTMLElement;

    // Simulate a resize drag: mousedown on handle → mousemove → mouseup
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    // Now click the header — sort should NOT fire because resize just happened
    const header = container.querySelector("[data-testid='col-header-name']") as HTMLElement;
    fireEvent.click(header);
    expect(onSort).not.toHaveBeenCalled();
  });

  it("calls onSort on the second click after resize (flag resets)", () => {
    const onSort = vi.fn();
    const { container } = render(<ActivitySpreadsheet {...defaultProps} onSort={onSort} />);

    const resizeHandle = container.querySelector("[data-testid='col-resize-name']") as HTMLElement;
    const header = container.querySelector("[data-testid='col-header-name']") as HTMLElement;

    // Resize drag
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    // First click after resize — consumed, no sort
    fireEvent.click(header);
    expect(onSort).not.toHaveBeenCalled();

    // Second click — should sort normally
    fireEvent.click(header);
    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith("name");
  });
});
