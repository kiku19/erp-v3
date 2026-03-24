import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ExceptionEditorContent } from "./exception-editor-content";
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
  calendarId: "cal-1",
  exceptions: MOCK_EXCEPTIONS,
  onDone: vi.fn(),
  onSave: vi.fn(),
  onCreateException: vi.fn(),
  onDeleteException: vi.fn(),
};

describe("ExceptionEditorContent", () => {
  beforeEach(() => vi.clearAllMocks());

  /* ─── Rendering ─── */

  it("renders Existing Exceptions label with count", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    expect(screen.getByText("Existing Exceptions")).toBeDefined();
    const badges = screen.getAllByText("2");
    expect(badges.find((el) => el.className.includes("rounded-full"))).toBeDefined();
  });

  it("renders exception names in left panel", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    expect(screen.getByText("New Year's Day")).toBeDefined();
    expect(screen.getByText("Half Day Friday")).toBeDefined();
  });

  it("renders empty state when no exceptions", () => {
    render(<ExceptionEditorContent {...defaultProps} exceptions={[]} />);
    expect(screen.getByText("No exception added")).toBeDefined();
  });

  it("renders exception type pills", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    expect(screen.getByText("Holiday")).toBeDefined();
    expect(screen.getByText("Non-Working")).toBeDefined();
    expect(screen.getByText("Misc")).toBeDefined();
  });

  it("renders form fields", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter exception name")).toBeDefined();
    expect(screen.getByPlaceholderText("DD / MM / YYYY")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. New Year's Day, Company Holiday...")).toBeDefined();
  });

  it("renders mini calendar", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    expect(screen.getByTestId("mini-calendar")).toBeDefined();
  });

  /* ─── onDone ─── */

  it("calls onDone when clicking Cancel", () => {
    const onDone = vi.fn();
    render(<ExceptionEditorContent {...defaultProps} onDone={onDone} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onDone).toHaveBeenCalled();
  });

  /* ─── Save ─── */

  it("Save button is disabled when form is incomplete", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    const saveBtn = screen.getByText("Save Exception").closest("button");
    expect(saveBtn?.disabled).toBe(true);
  });

  it("calls onCreateException on save", () => {
    const onCreateException = vi.fn();
    render(<ExceptionEditorContent {...defaultProps} onCreateException={onCreateException} />);
    fireEvent.change(screen.getByPlaceholderText("Enter exception name"), { target: { value: "Diwali" } });
    fireEvent.change(screen.getByPlaceholderText("DD / MM / YYYY"), { target: { value: "12 / 11 / 2026" } });
    fireEvent.click(screen.getByText("Save Exception"));
    expect(onCreateException).toHaveBeenCalledWith(expect.objectContaining({
      name: "Diwali",
      exceptionType: "Holiday",
    }));
  });

  /* ─── Click-to-fill ─── */

  it("auto-fills form when clicking an exception", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    fireEvent.click(screen.getByText("New Year's Day"));
    expect((screen.getByPlaceholderText("Enter exception name") as HTMLInputElement).value).toBe("New Year's Day");
    expect((screen.getByPlaceholderText("DD / MM / YYYY") as HTMLInputElement).value).toBe("01 / 01 / 2026");
  });

  /* ─── Delete ─── */

  it("opens delete confirmation when clicking trash icon", () => {
    render(<ExceptionEditorContent {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    expect(screen.getByText("Delete Exception")).toBeDefined();
  });

  it("calls onDeleteException on confirm", () => {
    const onDeleteException = vi.fn();
    render(<ExceptionEditorContent {...defaultProps} onDeleteException={onDeleteException} />);
    fireEvent.click(screen.getByLabelText("Delete New Year's Day"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(onDeleteException).toHaveBeenCalledWith("ex-1");
  });
});
