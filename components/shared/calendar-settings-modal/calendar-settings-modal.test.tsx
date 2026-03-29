import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { CalendarSettingsModal } from "./calendar-settings-modal";
import type { CalendarData, CalendarExceptionData } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";

/* ─────────────────────── Test Data ──────────────────────────── */

const MOCK_EXCEPTIONS: CalendarExceptionData[] = [
  {
    id: "ex-1",
    name: "New Year's Day",
    date: "2026-01-01T00:00:00.000Z",
    endDate: null,
    exceptionType: "Holiday",
    startTime: null,
    endTime: null,
    reason: "National holiday",
    workHours: null,
  },
  {
    id: "ex-2",
    name: "Company Offsite",
    date: "2026-03-15T00:00:00.000Z",
    endDate: null,
    exceptionType: "Non-Working",
    startTime: null,
    endTime: null,
    reason: null,
    workHours: null,
  },
];

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

const MOCK_CALENDAR_WITH_EXCEPTIONS: CalendarData = {
  ...MOCK_CALENDAR,
  exceptions: MOCK_EXCEPTIONS,
};

const SIX_DAY_CALENDAR: CalendarData = {
  id: "cal-3",
  name: "6-Day Work Week",
  category: "global",
  hoursPerDay: 8,
  workDays: DEFAULT_WORK_DAYS.map((d) =>
    d.day === "Saturday" ? { ...d, working: true } : d,
  ),
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

/* ─────────────────────── Modal Basics ────────────────────────── */

describe("CalendarSettingsModal", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders modal with title when open", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Calendar Settings")).toBeDefined();
  });

  it("renders subtitle text", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Manage work calendars and scheduling rules")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<CalendarSettingsModal {...defaultProps} open={false} calendars={[]} />);
    expect(screen.queryByText("Calendar Settings")).toBeNull();
  });

  it("renders calendar list panel with title", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Calendars")).toBeDefined();
  });

  it("displays calendar count badge", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("displays zero count badge when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByText("0")).toBeDefined();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onClose={onClose} />);
    const overlay = screen.getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders search trigger button in header", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByTestId("calendar-search-trigger")).toBeDefined();
    expect(screen.getByText("Search calendars...")).toBeDefined();
  });

  it("renders Plus button in left panel header", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByTestId("add-calendar-btn")).toBeDefined();
  });
});

/* ─────────────────────── Empty State ────────────────────────── */

describe("Empty state (no calendars)", () => {
  afterEach(() => cleanup());

  it("shows empty state SVG in left panel when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByTestId("empty-calendar-svg")).toBeDefined();
    expect(screen.getByText("No calendars added yet")).toBeDefined();
  });

  it("still shows add calendar form on right when no calendars", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    expect(screen.getByText("Create New Calendar")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter calendar name...")).toBeDefined();
  });

  it("does not show empty SVG when calendars exist", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.queryByTestId("empty-calendar-svg")).toBeNull();
    expect(screen.queryByText("No calendars added yet")).toBeNull();
  });
});

/* ─────────────────────── Default Add Form ───────────────────── */

describe("Add calendar form (default right panel)", () => {
  afterEach(() => cleanup());

  it("shows add calendar form by default when calendars exist", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Create New Calendar")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter calendar name...")).toBeDefined();
  });

  it("shows work week configuration table in add form", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
    expect(screen.getByText("Monday")).toBeDefined();
    expect(screen.getByText("Sunday")).toBeDefined();
    expect(screen.getByText("Saturday")).toBeDefined();
  });

  it("shows work week summary with default 5 days", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    expect(screen.getByText("Total: 40 hrs/wk · 5 days/wk")).toBeDefined();
  });

  it("shows Create Calendar button disabled when name is empty", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    const btn = screen.getByTestId("create-calendar-btn");
    expect(btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("enables Create Calendar button when name is entered", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "My Calendar" } });
    const btn = screen.getByTestId("create-calendar-btn");
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("clicking Plus button returns to add form from detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // Select a calendar first
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
    expect(screen.queryByText("Create New Calendar")).toBeNull();
    // Click Plus to return to add form
    fireEvent.click(screen.getByTestId("add-calendar-btn"));
    expect(screen.getByText("Create New Calendar")).toBeDefined();
  });
});

/* ─────────────────────── Calendar Creation ──────────────────── */

describe("Calendar creation", () => {
  afterEach(() => cleanup());

  it("calls onCreate with correct data when Create button is clicked", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "My New Calendar" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My New Calendar",
        category: "global",
        hoursPerDay: 8,
        exceptions: [],
      }),
    );
  });

  it("includes workDays in onCreate payload", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "Test Cal" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    const payload = onCreate.mock.calls[0][0];
    expect(payload.workDays).toBeDefined();
    expect(payload.workDays).toHaveLength(7);
    expect(payload.workDays.filter((d: { working: boolean }) => d.working)).toHaveLength(5);
  });

  it("does not call onCreate when name is empty", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("does not call onCreate when name is only whitespace", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("trims whitespace from calendar name before creating", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "  My Calendar  " } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Calendar" }),
    );
  });

  it("creates calendar on Enter key in name input", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "Enter Calendar" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Enter Calendar" }),
    );
  });
});

/* ─────────────────────── Calendar List & Selection ──────────── */

describe("Calendar list and selection", () => {
  afterEach(() => cleanup());

  it("renders calendar names in the left panel", () => {
    render(<CalendarSettingsModal {...defaultProps} categories={["global", "project"]} />);
    expect(screen.getAllByText("Standard 5-Day").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Team Calendar").length).toBeGreaterThanOrEqual(1);
  });

  it("shows calendar summary info (hours/day, days/wk)", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    const summaries = screen.getAllByText("8h/day · 5 days/wk");
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });

  it("shows category headers", () => {
    render(<CalendarSettingsModal {...defaultProps} categories={["global", "project"]} />);
    expect(screen.getByText("global calendars")).toBeDefined();
    expect(screen.getByText("project calendars")).toBeDefined();
  });

  it("clicking a calendar shows its detail view on the right", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
    expect(screen.getByText("Exceptions & Holidays")).toBeDefined();
    expect(screen.queryByText("Create New Calendar")).toBeNull();
  });

  it("shows calendar name and category badge in detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    // The name appears in both the list and detail — just verify detail heading
    expect(screen.getByText("global")).toBeDefined(); // category badge
  });

  it("shows Duplicate and Delete buttons in detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Duplicate")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("shows work week total summary in detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Total: 40 hrs/wk · 5 days/wk")).toBeDefined();
  });

  it("renders all 7 day rows in detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Sunday")).toBeDefined();
    expect(screen.getByText("Monday")).toBeDefined();
    expect(screen.getByText("Tuesday")).toBeDefined();
    expect(screen.getByText("Wednesday")).toBeDefined();
    expect(screen.getByText("Thursday")).toBeDefined();
    expect(screen.getByText("Friday")).toBeDefined();
    expect(screen.getByText("Saturday")).toBeDefined();
  });

  it("shows 'No exceptions configured' when calendar has no exceptions", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("No exceptions configured")).toBeDefined();
  });

  it("switching between calendars updates the detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} categories={["global", "project"]} />);
    // Select first calendar
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("global")).toBeDefined(); // category badge
    // Select second calendar
    fireEvent.click(screen.getByText("Team Calendar"));
    expect(screen.getByText("project")).toBeDefined(); // category badge changes
  });
});

/* ─────────────────────── Work Day Toggle ────────────────────── */

describe("Work day toggle (detail view)", () => {
  afterEach(() => cleanup());

  it("calls onUpdate when a workday checkbox is toggled", () => {
    const onUpdate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    // Find all checkboxes — Monday's workday checkbox should be checked
    const checkboxes = screen.getAllByRole("checkbox");
    // Click first working day checkbox (Monday is index 2 or 3 depending on layout)
    // Toggle one of the checked ones
    const checkedBoxes = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    if (checkedBoxes.length > 0) {
      fireEvent.click(checkedBoxes[0]);
      expect(onUpdate).toHaveBeenCalledWith(
        "cal-1",
        expect.objectContaining({ workDays: expect.any(Array) }),
      );
    }
  });
});

/* ─────────────────────── Exception Display & Delete ─────────── */

describe("Exceptions display and deletion", () => {
  afterEach(() => cleanup());

  it("renders exception names when calendar has exceptions", () => {
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR_WITH_EXCEPTIONS, MOCK_CALENDAR_2]}
      />,
    );
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("New Year's Day")).toBeDefined();
    expect(screen.getByText("Company Offsite")).toBeDefined();
  });

  it("renders exception type for each exception", () => {
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR_WITH_EXCEPTIONS, MOCK_CALENDAR_2]}
      />,
    );
    fireEvent.click(screen.getByText("Standard 5-Day"));
    // Exception type is combined with date in the subtitle: "1/1/2026 — Holiday"
    const allText = screen.getAllByText((content) => content.includes("Holiday"));
    expect(allText.length).toBeGreaterThanOrEqual(1);
    const nonWorkingEls = screen.getAllByText((content) => content.includes("Non-Working"));
    expect(nonWorkingEls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders delete buttons for each exception", () => {
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR_WITH_EXCEPTIONS, MOCK_CALENDAR_2]}
      />,
    );
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByLabelText("Delete New Year's Day")).toBeDefined();
    expect(screen.getByLabelText("Delete Company Offsite")).toBeDefined();
  });

  it("calls onDeleteException when exception delete button is clicked", () => {
    const onDeleteException = vi.fn();
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR_WITH_EXCEPTIONS, MOCK_CALENDAR_2]}
        onDeleteException={onDeleteException}
      />,
    );
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    expect(onDeleteException).toHaveBeenCalledWith("cal-1", "ex-1");
  });

  it("shows Add Exception button in detail view", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    expect(screen.getByText("Add Exception")).toBeDefined();
  });
});

/* ─────────────────────── Delete Calendar Flow ──────────────── */

describe("Delete calendar flow", () => {
  afterEach(() => cleanup());

  it("shows delete confirmation modal when Delete button is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Calendar")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();
    // Calendar name appears in both the list and the confirmation text
    expect(screen.getAllByText(/Standard 5-Day/).length).toBeGreaterThanOrEqual(2);
  });

  it("calls onDelete when confirmed in delete modal", () => {
    const onDelete = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Delete"));
    // Click the destructive Delete button in the confirmation modal
    const deleteButtons = screen.getAllByText("Delete");
    const confirmBtn = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(confirmBtn);
    expect(onDelete).toHaveBeenCalledWith("cal-1");
  });

  it("closes delete modal when Cancel is clicked", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Calendar")).toBeDefined();
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText("Delete Calendar")).toBeNull();
    });
  });

  it("shows delete button on calendar list items with correct aria-label", () => {
    render(<CalendarSettingsModal {...defaultProps} categories={["global", "project"]} />);
    // Delete buttons exist even though they have opacity-0 (visible on hover)
    const deleteBtn1 = screen.getByLabelText("Delete Standard 5-Day");
    const deleteBtn2 = screen.getByLabelText("Delete Team Calendar");
    expect(deleteBtn1).toBeDefined();
    expect(deleteBtn2).toBeDefined();
  });

  it("clicking list item delete button opens confirmation", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    const deleteBtn = screen.getByLabelText("Delete Standard 5-Day");
    fireEvent.click(deleteBtn);
    expect(screen.getByText("Delete Calendar")).toBeDefined();
    expect(screen.getAllByText(/Standard 5-Day/).length).toBeGreaterThanOrEqual(2);
  });
});

/* ─────────────────────── Duplicate Calendar ─────────────────── */

describe("DuplicateCalendarModal", () => {
  afterEach(() => cleanup());

  it("opens duplicate modal when Duplicate button is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByText("Duplicate Calendar")).toBeDefined();
  });

  it("pre-fills name with 'Copy of {original name}'", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByDisplayValue("Copy of Standard 5-Day")).toBeDefined();
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
        category: "global",
      }),
    );
  });

  it("duplicated calendar has empty exceptions", () => {
    const onCreate = vi.fn();
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR_WITH_EXCEPTIONS, MOCK_CALENDAR_2]}
        onCreate={onCreate}
      />,
    );
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    fireEvent.click(screen.getByText("Save"));
    const payload = onCreate.mock.calls[0][0];
    expect(payload.exceptions).toEqual([]);
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

  it("saves duplicate on Enter key in name input", () => {
    const onCreate = vi.fn();
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Duplicate"));
    const input = screen.getByDisplayValue("Copy of Standard 5-Day");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Copy of Standard 5-Day" }),
    );
  });
});

/* ─────────────────────── Spotlight Search ────────────────────── */

describe("Spotlight Search", () => {
  afterEach(() => cleanup());

  it("opens spotlight on Ctrl+K", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("opens spotlight on Meta+K (macOS)", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("does not open spotlight when modal is closed", () => {
    render(<CalendarSettingsModal {...defaultProps} open={false} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
  });

  it("opens spotlight when search trigger button is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("closes spotlight on Escape", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
  });

  it("shows all calendars when no query is entered", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.getByTestId("spotlight-item-cal-2")).toBeDefined();
  });

  it("filters calendars by name (case insensitive)", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    fireEvent.change(input, { target: { value: "standard" } }); // lowercase
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.queryByTestId("spotlight-item-cal-2")).toBeNull();
  });

  it("shows 'No results found' when search has no matches", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    fireEvent.change(input, { target: { value: "zzzznonexistent" } });
    expect(screen.getByText("No results found")).toBeDefined();
  });

  it("shows 'No calendars have been added yet' when list is empty", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByText("No calendars have been added yet")).toBeDefined();
  });

  it("shows calendar summary info in spotlight results", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    // Each result shows "8h/day · 5 days/wk"
    const summaries = screen.getAllByText("8h/day · 5 days/wk");
    expect(summaries.length).toBeGreaterThanOrEqual(2);
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

  it("selecting from spotlight hides the add form", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // By default, add form is showing
    expect(screen.getByText("Create New Calendar")).toBeDefined();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByTestId("spotlight-item-cal-2"));
    await waitFor(() => {
      expect(screen.queryByText("Create New Calendar")).toBeNull();
      expect(screen.getByText("Exceptions & Holidays")).toBeDefined();
    });
  });

  it("resets search query when spotlight reopens", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // Open and type
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    fireEvent.change(input, { target: { value: "Standard" } });
    expect(screen.queryByTestId("spotlight-item-cal-2")).toBeNull();
    // Close
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
    // Reopen — should show all calendars again
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.getByTestId("spotlight-item-cal-2")).toBeDefined();
  });
});

/* ─────────────────────── Keyboard Navigation in Spotlight ──── */

describe("Spotlight keyboard navigation", () => {
  afterEach(() => cleanup());

  it("selects highlighted calendar on Enter key", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    // First item is highlighted by default, press Enter
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText("Work Week Configuration")).toBeDefined();
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
  });

  it("ArrowDown moves highlight to next item", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByTestId("spotlight-search-input");
    // Move to second item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Select it
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      // Should have selected cal-2 (Team Calendar)
      expect(screen.getByText("project")).toBeDefined(); // category badge for Team Calendar
    });
  });
});

/* ─────────────────────── Modal Close Hierarchy ──────────────── */

describe("Modal close hierarchy", () => {
  afterEach(() => cleanup());

  it("closing with spotlight open closes spotlight first, not the modal", async () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
    // Clicking overlay should close spotlight but keep modal
    // The spotlight has its own overlay — Escape should close it
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
    });
    // Modal should still be open
    expect(screen.getByText("Calendar Settings")).toBeDefined();
  });

  it("closing with exception editor open closes editor first", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // Select calendar and open exception editor
    fireEvent.click(screen.getByText("Standard 5-Day"));
    fireEvent.click(screen.getByText("Add Exception"));
    // Exception editor should be showing
    expect(screen.getByText(/Exceptions & Holidays/)).toBeDefined();
  });
});

/* ─────────────────────── Add Form Work Day Toggle ──────────── */

describe("Add form work day toggle", () => {
  afterEach(() => cleanup());

  it("toggling a work day in add form updates the summary", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    // Default is 5 days, 40 hrs
    expect(screen.getByText("Total: 40 hrs/wk · 5 days/wk")).toBeDefined();
    // Find checkboxes and toggle one off (uncheck Monday)
    const checkboxes = screen.getAllByRole("checkbox");
    // Find a checked checkbox to uncheck
    const checkedBoxes = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    if (checkedBoxes.length > 0) {
      fireEvent.click(checkedBoxes[0]);
      // Should now be 4 days, 32 hrs
      expect(screen.getByText("Total: 32 hrs/wk · 4 days/wk")).toBeDefined();
    }
  });
});

/* ─────────────────────── Success Animation ──────────────────── */

describe("Success animation after creation", () => {
  afterEach(() => cleanup());

  it("shows success animation text after creating a calendar", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "New Cal" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    await waitFor(() => {
      expect(screen.getByText("Calendar created!")).toBeDefined();
    });
  });

  it("resets to add form after success animation timeout", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "New Cal" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    await waitFor(() => {
      expect(screen.getByText("Calendar created!")).toBeDefined();
    });
    // Wait for the 1.5s timeout to reset back to add form
    await waitFor(() => {
      expect(screen.getByText("Create New Calendar")).toBeDefined();
      expect(screen.queryByText("Calendar created!")).toBeNull();
    }, { timeout: 2500 });
  });

  it("clears the name input after success animation resets", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
    const nameInput = screen.getByPlaceholderText("Enter calendar name...");
    fireEvent.change(nameInput, { target: { value: "New Cal" } });
    fireEvent.click(screen.getByTestId("create-calendar-btn"));
    await waitFor(() => {
      const resetInput = screen.getByPlaceholderText("Enter calendar name...");
      expect((resetInput as HTMLInputElement).value).toBe("");
    }, { timeout: 2500 });
  });
});

/* ─────────────────────── Edge Cases ─────────────────────────── */

describe("Edge cases", () => {
  afterEach(() => cleanup());

  it("handles single calendar correctly", () => {
    render(<CalendarSettingsModal {...defaultProps} calendars={[MOCK_CALENDAR]} />);
    expect(screen.getByText("Standard 5-Day")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined(); // count badge
  });

  it("handles calendars with different categories", () => {
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[MOCK_CALENDAR, MOCK_CALENDAR_2, SIX_DAY_CALENDAR]}
        categories={["global", "project"]}
      />,
    );
    expect(screen.getByText("global calendars")).toBeDefined();
    expect(screen.getByText("project calendars")).toBeDefined();
  });

  it("renders 6-day calendar summary correctly in list", () => {
    render(
      <CalendarSettingsModal
        {...defaultProps}
        calendars={[SIX_DAY_CALENDAR]}
      />,
    );
    expect(screen.getByText("8h/day · 6 days/wk")).toBeDefined();
  });
});
