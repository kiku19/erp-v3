import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GanttSettingsModal } from "./gantt-settings-modal";
import { DEFAULT_GANTT_SETTINGS } from "./gantt-utils";

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  settings: { ...DEFAULT_GANTT_SETTINGS },
  onApply: vi.fn(),
};

describe("GanttSettingsModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<GanttSettingsModal {...defaultProps} />);
    expect(screen.getByText("Gantt Settings")).toBeDefined();
  });

  it("renders three tabs with bars and display disabled", () => {
    render(<GanttSettingsModal {...defaultProps} />);
    expect(screen.getByText("Timescale")).toBeDefined();
    const barsTab = screen.getByText("Bars");
    const displayTab = screen.getByText("Display");
    expect(barsTab).toBeDefined();
    expect(displayTab).toBeDefined();
    expect(barsTab.closest("button")?.hasAttribute("disabled")).toBe(true);
    expect(displayTab.closest("button")?.hasAttribute("disabled")).toBe(true);
  });

  it("does not switch to display tab when clicked (disabled)", () => {
    render(<GanttSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Display"));
    // Should still show timescale content, not display toggles
    expect(screen.queryByText("Critical Path")).toBeNull();
    expect(screen.getByText("Zoom Level")).toBeDefined();
  });

  it("calls onApply with settings when Apply is clicked", () => {
    const onApply = vi.fn();
    render(<GanttSettingsModal {...defaultProps} onApply={onApply} />);
    fireEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_GANTT_SETTINGS);
  });

  it("calls onClose when Apply is clicked", () => {
    const onClose = vi.fn();
    render(<GanttSettingsModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Apply"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Reset to Defaults button", () => {
    render(<GanttSettingsModal {...defaultProps} />);
    expect(screen.getByText("Reset to Defaults")).toBeDefined();
  });

  it("shows zoom level preview text", () => {
    render(<GanttSettingsModal {...defaultProps} />);
    expect(screen.getByText(/Top:.*Month.*Bottom:.*Week/)).toBeDefined();
  });
});
