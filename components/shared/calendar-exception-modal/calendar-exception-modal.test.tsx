import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { CalendarExceptionModal } from "./calendar-exception-modal";
import type { CalendarExceptionData, ExceptionTypeData } from "@/lib/planner/calendar-types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const MOCK_TYPES: ExceptionTypeData[] = [
  { id: "et-1", name: "Holiday", color: "error" },
  { id: "et-2", name: "Non-Working", color: "warning" },
  { id: "et-3", name: "Half Day", color: "info" },
];

const MOCK_EXCEPTIONS: CalendarExceptionData[] = [
  {
    id: "ex-1",
    name: "New Year's Day",
    date: "2026-01-01T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: "National holiday",
    workHours: null,
  },
  {
    id: "ex-2",
    name: "Republic Day",
    date: "2026-01-26T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: null,
    workHours: null,
  },
];

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  calendarId: "cal-1",
  exceptions: MOCK_EXCEPTIONS,
  exceptionTypes: MOCK_TYPES,
  onSave: vi.fn(),
};

describe("CalendarExceptionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    render(<CalendarExceptionModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with title when open", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Exception")).toBeDefined();
  });

  it("renders Existing Exceptions label", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Existing Exceptions")).toBeDefined();
  });

  it("renders exception count badge", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    // The count badge shows the number of exceptions
    const badges = screen.getAllByText("2");
    const badge = badges.find((el) => el.className.includes("rounded-full"));
    expect(badge).toBeDefined();
  });

  it("renders exception names in left panel", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("New Year's Day")).toBeDefined();
    expect(screen.getByText("Republic Day")).toBeDefined();
  });

  it("renders empty state when no exceptions", () => {
    render(<CalendarExceptionModal {...defaultProps} exceptions={[]} />);
    expect(screen.getByText("No exception added")).toBeDefined();
  });

  it("renders exception type pills", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Holiday")).toBeDefined();
    expect(screen.getByText("Non-Working")).toBeDefined();
    expect(screen.getByText("Half Day")).toBeDefined();
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

  it("renders add exception type button", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByLabelText("Add exception type")).toBeDefined();
  });

  it("renders delete buttons for each exception", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByLabelText("Delete New Year's Day")).toBeDefined();
    expect(screen.getByLabelText("Delete Republic Day")).toBeDefined();
  });

  it("auto-fills form when clicking an exception", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByText("New Year's Day"));
    const nameInput = screen.getByPlaceholderText("Enter exception name") as HTMLInputElement;
    expect(nameInput.value).toBe("New Year's Day");
    const dateInput = screen.getByPlaceholderText("DD / MM / YYYY") as HTMLInputElement;
    expect(dateInput.value).toBe("01 / 01 / 2026");
  });

  it("opens delete confirmation when clicking trash icon", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    // Confirmation modal appears
    expect(screen.getByText("Delete Exception")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();
  });

  it("closes delete confirmation when clicking Cancel", async () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    // There are now 2 Cancel buttons — the footer one and the confirmation one
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    // Wait for animation unmount (150ms timeout in Modal)
    await waitFor(() => {
      expect(screen.queryByText("Delete Exception")).toBeNull();
    }, { timeout: 500 });
  });

  it("calls delete API when confirming delete", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-1", name: "New Year's Day" }), { status: 200 }),
    );
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    // Click Delete in confirmation
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/planner/calendars/cal-1/exceptions/ex-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    fetchSpy.mockRestore();
  });

  it("calls save API when submitting form", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-new", name: "Test" }), { status: 201 }),
    );
    render(<CalendarExceptionModal {...defaultProps} />);
    // Fill form
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Test Holiday" } });
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

  it("Save button is disabled when form is incomplete", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    const saveBtn = screen.getByText("Save Exception").closest("button");
    expect(saveBtn?.disabled).toBe(true);
  });

  it("calls onClose when clicking X button", () => {
    const onClose = vi.fn();
    render(<CalendarExceptionModal {...defaultProps} onClose={onClose} />);
    // The X button is the one with the X icon
    const closeButtons = document.querySelectorAll("[role='dialog'] button");
    // First button inside dialog header is the X
    const xButton = Array.from(closeButtons).find((btn) => {
      return btn.querySelector("svg") && btn.className.includes("h-8");
    });
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders delete buttons for exception types on hover", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByLabelText("Delete type Holiday")).toBeDefined();
    expect(screen.getByLabelText("Delete type Non-Working")).toBeDefined();
    expect(screen.getByLabelText("Delete type Half Day")).toBeDefined();
  });

  it("opens delete type confirmation when clicking type delete button", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete type Holiday"));
    expect(screen.getByText("Delete Exception Type")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete the "Holiday"/)).toBeDefined();
  });

  it("calls delete type API when confirming type delete", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "et-1", name: "Holiday", color: "error" }), { status: 200 }),
    );
    render(<CalendarExceptionModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete type Holiday"));
    // Click Delete in confirmation
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/planner/exception-types/et-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    fetchSpy.mockRestore();
  });
});
