import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CalendarSettingsModal } from "./calendar-settings-modal";

describe("CalendarSettingsModal", () => {
  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Calendar Settings")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<CalendarSettingsModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Calendar Settings")).toBeNull();
  });

  it("renders calendar list panel", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Calendars")).toBeDefined();
  });

  it("renders work week configuration", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
  });

  it("renders day names", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Monday")).toBeDefined();
    expect(screen.getByText("Friday")).toBeDefined();
    expect(screen.getByText("Sunday")).toBeDefined();
  });

  it("renders exceptions section", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Exceptions & Holidays")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<CalendarSettingsModal open={true} onClose={onClose} />);
    // Modal has its own close mechanism via overlay
    const overlay = screen.getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
