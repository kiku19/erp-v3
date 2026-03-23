import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { CalendarExceptionModal } from "./calendar-exception-modal";
import type { CalendarExceptionData } from "@/lib/planner/calendar-types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

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
    name: "Half Day Friday",
    date: "2026-01-09T00:00:00.000Z",
    endDate: null,
    exceptionType: "Misc",
    startTime: "09:00",
    endTime: "13:00",
    reason: null,
    workHours: null,
  },
];

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  calendarId: "cal-1",
  exceptions: MOCK_EXCEPTIONS,
  onSave: vi.fn(),
  onCreateException: vi.fn(),
  onDeleteException: vi.fn(),
};

describe("CalendarExceptionModal", () => {
  beforeEach(() => vi.clearAllMocks());

  /* ─── Rendering ─── */

  it("renders nothing when open is false", () => {
    render(<CalendarExceptionModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with title when open", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Exception")).toBeDefined();
  });

  it("renders Existing Exceptions label with count", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Existing Exceptions")).toBeDefined();
    const badges = screen.getAllByText("2");
    expect(badges.find((el) => el.className.includes("rounded-full"))).toBeDefined();
  });

  it("renders exception names in left panel", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("New Year's Day")).toBeDefined();
    expect(screen.getByText("Half Day Friday")).toBeDefined();
  });

  it("renders empty state when no exceptions", () => {
    render(<CalendarExceptionModal {...defaultProps} exceptions={[]} />);
    expect(screen.getByText("No exception added")).toBeDefined();
  });

  it("renders exception type pills (Holiday, Non-Working, Misc)", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Holiday")).toBeDefined();
    expect(screen.getByText("Non-Working")).toBeDefined();
    expect(screen.getByText("Misc")).toBeDefined();
  });

  it("renders form fields", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter exception name")).toBeDefined();
    expect(screen.getByPlaceholderText("DD / MM / YYYY")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. New Year's Day, Company Holiday...")).toBeDefined();
  });

  it("renders Cancel and Save Exception buttons", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Save Exception")).toBeDefined();
  });

  it("renders mini calendar", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByTestId("mini-calendar")).toBeDefined();
  });

  it("renders delete buttons for each exception", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByLabelText("Delete New Year's Day")).toBeDefined();
    expect(screen.getByLabelText("Delete Half Day Friday")).toBeDefined();
  });

  /* ─── Full Day Checkbox ─── */

  it("renders Full Day checkbox and label", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Full Day")).toBeDefined();
  });

  it("time inputs are disabled when Full Day is checked", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    const timeInputs = document.querySelectorAll("input[type='time']");
    timeInputs.forEach((input) => {
      expect((input as HTMLInputElement).disabled).toBe(true);
    });
  });

  it("unchecking Full Day enables time inputs and sets defaults (09:00 - 18:00)", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    // Click on the "Full Day" text to toggle
    fireEvent.click(screen.getByText("Full Day"));
    const timeInputs = document.querySelectorAll("input[type='time']");
    const startInput = timeInputs[0] as HTMLInputElement;
    const endInput = timeInputs[1] as HTMLInputElement;
    expect(startInput.disabled).toBe(false);
    expect(endInput.disabled).toBe(false);
    expect(startInput.value).toBe("09:00");
    expect(endInput.value).toBe("18:00");
  });

  it("re-checking Full Day clears time inputs and disables them", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    // Uncheck
    fireEvent.click(screen.getByText("Full Day"));
    // Re-check
    fireEvent.click(screen.getByText("Full Day"));
    const timeInputs = document.querySelectorAll("input[type='time']");
    const startInput = timeInputs[0] as HTMLInputElement;
    expect(startInput.disabled).toBe(true);
    expect(startInput.value).toBe("");
  });

  /* ─── Click-to-fill ─── */

  it("auto-fills form when clicking an exception", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByText("New Year's Day"));
    expect((screen.getByPlaceholderText("Enter exception name") as HTMLInputElement).value).toBe("New Year's Day");
    expect((screen.getByPlaceholderText("DD / MM / YYYY") as HTMLInputElement).value).toBe("01 / 01 / 2026");
  });

  it("clicking a full-day exception sets Full Day checked", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    // First uncheck full day
    fireEvent.click(screen.getByText("Full Day"));
    // Then click a full-day exception (no startTime/endTime)
    fireEvent.click(screen.getByText("New Year's Day"));
    const timeInputs = document.querySelectorAll("input[type='time']");
    expect((timeInputs[0] as HTMLInputElement).disabled).toBe(true);
  });

  it("clicking a non-full-day exception unchecks Full Day and fills times", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    // Click Half Day Friday which has startTime/endTime
    fireEvent.click(screen.getByText("Half Day Friday"));
    const timeInputs = document.querySelectorAll("input[type='time']");
    const startInput = timeInputs[0] as HTMLInputElement;
    const endInput = timeInputs[1] as HTMLInputElement;
    expect(startInput.disabled).toBe(false);
    expect(startInput.value).toBe("09:00");
    expect(endInput.value).toBe("13:00");
  });

  /* ─── Exception Type Selection ─── */

  it("changes exception type when clicking a different pill", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    const nonWorking = screen.getByText("Non-Working");
    fireEvent.click(nonWorking);
    // Non-Working pill should now have active styling (warning border)
    const pill = nonWorking.closest("button");
    expect(pill?.className).toContain("border-[var(--color-warning)]");
  });

  /* ─── Date sync ─── */

  it("typing a date updates the calendar", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "15 / 06 / 2026" } });
    expect(screen.getByText("June 2026")).toBeDefined();
  });

  /* ─── Save ─── */

  it("Save button is disabled when form is incomplete", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    const saveBtn = screen.getByText("Save Exception").closest("button");
    expect(saveBtn?.disabled).toBe(true);
  });

  it("Save button enabled when name and date are filled", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "15 / 03 / 2026" } });
    const saveBtn = screen.getByText("Save Exception").closest("button");
    expect(saveBtn?.disabled).toBe(false);
  });

  it("calls onCreateException when provided (local state mode)", () => {
    const onCreateException = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onCreateException={onCreateException} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Diwali" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "12 / 11 / 2026" } });
    fireEvent.click(screen.getByText("Save Exception"));
    expect(onCreateException).toHaveBeenCalledWith(expect.objectContaining({
      name: "Diwali",
      exceptionType: "Holiday",
      startTime: null,
      endTime: null,
    }));
  });

  it("save with full day unchecked sends time values", () => {
    const onCreateException = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onCreateException={onCreateException} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Half Day" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "15 / 03 / 2026" } });
    // Uncheck full day
    fireEvent.click(screen.getByText("Full Day"));
    fireEvent.click(screen.getByText("Save Exception"));
    expect(onCreateException).toHaveBeenCalledWith(expect.objectContaining({
      name: "Half Day",
      startTime: "09:00",
      endTime: "18:00",
    }));
  });

  it("calls API when onCreateException is not provided", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-new", name: "Test" }), { status: 201 }),
    );
    render(<CalendarExceptionModal {...defaultProps} onCreateException={undefined} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "15 / 03 / 2026" } });
    fireEvent.click(screen.getByText("Save Exception"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/planner/calendars/cal-1/exceptions",
        expect.objectContaining({ method: "POST" }),
      );
    });
    fetchSpy.mockRestore();
  });

  it("form resets after successful save", async () => {
    const onCreateException = vi.fn().mockResolvedValue(undefined);
    render(<CalendarExceptionModal {...defaultProps} onCreateException={onCreateException} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "15 / 03 / 2026" } });
    fireEvent.click(screen.getByText("Save Exception"));
    await waitFor(() => {
      expect((screen.getByPlaceholderText("Enter exception name") as HTMLInputElement).value).toBe("");
    });
  });

  /* ─── Delete ─── */

  it("opens delete confirmation when clicking trash icon", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    expect(screen.getByText("Delete Exception")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();
  });

  it("closes delete confirmation when clicking Cancel", async () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText("Delete Exception")).toBeNull();
    }, { timeout: 500 });
  });

  it("calls onDeleteException when provided", () => {
    const onDeleteException = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onDeleteException={onDeleteException} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(onDeleteException).toHaveBeenCalledWith("ex-1");
  });

  it("calls API delete when onDeleteException is not provided", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-1" }), { status: 200 }),
    );
    render(<CalendarExceptionModal {...defaultProps} onDeleteException={undefined} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/planner/calendars/cal-1/exceptions/ex-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    fetchSpy.mockRestore();
  });

  /* ─── Close ─── */

  it("calls onClose when clicking X button", () => {
    const onClose = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onClose={onClose} />);
    const closeButtons = document.querySelectorAll("[role='dialog'] button");
    const xButton = Array.from(closeButtons).find((btn) =>
      btn.querySelector("svg") && btn.className.includes("h-8"),
    );
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking Cancel button", () => {
    const onClose = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
