import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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

const MOCK_CALENDAR_2: CalendarData = {
  id: "cal-2",
  name: "Team Calendar",
  category: "project",
  hoursPerDay: 8,
  workDays: DEFAULT_WORK_DAYS,
  exceptions: [],
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  calendars: [MOCK_CALENDAR, MOCK_CALENDAR_2],
  onCreate: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onDeleteException: vi.fn(),
};

describe("CalendarSettingsModal", () => {
  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Calendar Settings")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<CalendarSettingsModal {...defaultProps} open={false} calendars={[]} />);
    expect(screen.queryByText("Calendar Settings")).toBeNull();
  });

  it("renders calendar list panel", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Calendars")).toBeDefined();
  });

  it("renders work week configuration", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
  });

  it("renders day names", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Monday")).toBeDefined();
    expect(screen.getByText("Friday")).toBeDefined();
    expect(screen.getByText("Sunday")).toBeDefined();
  });

  it("renders exceptions section", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Exceptions & Holidays")).toBeDefined();
  });

  it("shows empty state when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByText("Create a calendar to get started")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onClose={onClose} />);
    const overlay = screen.getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("DuplicateCalendarModal (via Duplicate button)", () => {
  afterEach(() => cleanup());

  it("opens duplicate modal when Duplicate button is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByText("Duplicate Calendar")).toBeDefined();
  });

  it("pre-fills name with 'Copy of {original name}'", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Duplicate"));
    const input = screen.getByDisplayValue("Copy of Standard 5-Day");
    expect(input).toBeDefined();
  });

  it("calls onCreate with duplicated data on Save", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByText("Duplicate"));
    fireEvent.click(screen.getByText("Save"));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Copy of Standard 5-Day",
        hoursPerDay: 8,
      }),
    );
  });

  it("closes duplicate modal on Cancel", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByText("Duplicate Calendar")).toBeDefined();
    // Click the Cancel button within the duplicate modal
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText("Duplicate Calendar")).toBeNull();
    });
  });
});

describe("CalendarSearchModal (via search area)", () => {
  afterEach(() => cleanup());

  it("opens search modal when search area is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByText("Select Calendar")).toBeDefined();
  });

  it("shows calendar items in the search modal", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByText("Choose a calendar to assign to this project")).toBeDefined();
  });

  it("renders a search input in the modal", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByPlaceholderText("Search calendars...")).toBeDefined();
  });

  it("renders Cancel and Assign buttons", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    // These are in the search modal footer
    expect(screen.getByTestId("search-modal-cancel")).toBeDefined();
    expect(screen.getByTestId("search-modal-assign")).toBeDefined();
  });

  it("closes search modal on Cancel", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByText("Select Calendar")).toBeDefined();
    fireEvent.click(screen.getByTestId("search-modal-cancel"));
    await waitFor(() => {
      expect(screen.queryByText("Select Calendar")).toBeNull();
    });
  });
});
