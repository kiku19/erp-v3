import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CalendarSettingsModal } from "./calendar-settings-modal";
import type { CalendarData } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";

const MOCK_CALENDAR: CalendarData = {
  id: "cal-1",
  name: "Standard 5-Day",
  category: "global",
  hoursPerDay: 8,
  workDays: DEFAULT_WORK_DAYS,
  exceptions: [],
};

describe("CalendarSettingsModal", () => {
  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Calendar Settings")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<CalendarSettingsModal open={false} onClose={vi.fn()} projectId="proj-1" calendars={[]} onCalendarChange={vi.fn()} />);
    expect(screen.queryByText("Calendar Settings")).toBeNull();
  });

  it("renders calendar list panel", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Calendars")).toBeDefined();
  });

  it("renders work week configuration", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
  });

  it("renders day names", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Monday")).toBeDefined();
    expect(screen.getByText("Friday")).toBeDefined();
    expect(screen.getByText("Sunday")).toBeDefined();
  });

  it("renders exceptions section", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Exceptions & Holidays")).toBeDefined();
  });

  it("shows empty state when no calendars", () => {
    render(<CalendarSettingsModal open={true} onClose={vi.fn()} projectId="proj-1" calendars={[]} onCalendarChange={vi.fn()} />);
    expect(screen.getByText("Create a calendar to get started")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<CalendarSettingsModal open={true} onClose={onClose} projectId="proj-1" calendars={[MOCK_CALENDAR]} onCalendarChange={vi.fn()} />);
    const overlay = screen.getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
