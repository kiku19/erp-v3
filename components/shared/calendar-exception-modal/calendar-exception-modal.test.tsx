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
    name: "Republic Day",
    date: "2026-01-26T00:00:00.000Z",
    endDate: null,
    exceptionType: "Holiday",
    startTime: null,
    endTime: null,
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
};

describe("CalendarExceptionModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when open is false", () => {
    render(<CalendarExceptionModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with title when open", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Exception")).toBeDefined();
  });

  it("renders exception count badge", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
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

  it("renders exception type pills (Holiday, Non-Working, Misc)", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Holiday")).toBeDefined();
    expect(screen.getByText("Non-Working")).toBeDefined();
    expect(screen.getByText("Misc")).toBeDefined();
  });

  it("renders form fields including time inputs", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter exception name")).toBeDefined();
    expect(screen.getByPlaceholderText("DD / MM / YYYY")).toBeDefined();
    expect(screen.getByText("Start Time")).toBeDefined();
    expect(screen.getByText("End Time")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. New Year's Day, Company Holiday...")).toBeDefined();
  });

  it("does not render selected date info bar", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.queryByText(/Selected:/)).toBeNull();
  });

  it("renders Cancel and Save Exception buttons", () => {
    render(<CalendarExceptionModal {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Save Exception")).toBeDefined();
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
    expect(screen.getByText("Delete Exception")).toBeDefined();
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

  it("calls delete API when confirming delete", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-1", name: "deleted" }), { status: 200 }),
    );
    render(<CalendarExceptionModal {...defaultProps} />);
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

  it("calls save API when submitting form", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ex-new", name: "Test" }), { status: 201 }),
    );
    render(<CalendarExceptionModal {...defaultProps} />);
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
});
