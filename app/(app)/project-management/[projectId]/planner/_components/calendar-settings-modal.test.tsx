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

  it("shows empty state SVG in left panel when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByTestId("empty-calendar-svg")).toBeDefined();
    expect(screen.getByText("No calendars added yet")).toBeDefined();
  });

  it("shows add calendar form by default when calendars exist", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Create New Calendar")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter calendar name...")).toBeDefined();
  });

  it("shows add calendar form by default when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByText("Create New Calendar")).toBeDefined();
  });

  it("clicking Plus button shows add calendar form on right", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // First select a calendar
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
    // Click Plus to return to add form
    fireEvent.click(screen.getByTestId("add-calendar-btn"));
    expect(screen.getByText("Create New Calendar")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onClose={onClose} />);
    const overlay = screen.getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens spotlight search on Ctrl+K", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("closes spotlight search on Escape", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
  });

  it("spotlight shows no calendars message when list is empty", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByText("No calendars have been added yet")).toBeDefined();
  });

  it("spotlight filters calendars by name", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    fireEvent.change(input, { target: { value: "Standard" } });
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.queryByTestId("spotlight-item-cal-2")).toBeNull();
  });

  it("spotlight shows no results message when search has no matches", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    fireEvent.change(input, { target: { value: "zzzznonexistent" } });
    expect(screen.getByText("No results found")).toBeDefined();
  });

  it("selecting a calendar from spotlight navigates to its details", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByTestId("spotlight-item-cal-1"));
    await waitFor(() => {
      expect(screen.getByText("Work Week Configuration")).toBeDefined();
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
  });

  it("shows success state after creating a calendar", async () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "My New Calendar" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My New Calendar" }),
    );
  });
});

describe("DuplicateCalendarModal (via Duplicate button)", () => {
  afterEach(() => cleanup());

  it("opens duplicate modal when Duplicate button is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // First select a calendar to see the Duplicate button
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByText("Duplicate Calendar")).toBeDefined();
  });

  it("pre-fills name with 'Copy of {original name}'", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    const input = screen.getByDisplayValue("Copy of Standard 5-Day");
    expect(input).toBeDefined();
  });

  it("calls onCreate with duplicated data on Save", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
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
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByText("Duplicate Calendar")).toBeDefined();
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText("Duplicate Calendar")).toBeNull();
    });
  });
});

describe("Spotlight Search (via search trigger)", () => {
  afterEach(() => cleanup());

  it("opens spotlight when search trigger is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("shows calendar items in spotlight", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.getByTestId("spotlight-item-cal-2")).toBeDefined();
  });
});
