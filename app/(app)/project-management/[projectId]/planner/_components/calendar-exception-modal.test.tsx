import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CalendarExceptionModal } from "./calendar-exception-modal";

describe("CalendarExceptionModal", () => {
  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<CalendarExceptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Add Exception")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<CalendarExceptionModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Add Exception")).toBeNull();
  });

  it("renders exception type options", () => {
    render(<CalendarExceptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Holiday")).toBeDefined();
    expect(screen.getByText("Non-Working")).toBeDefined();
    expect(screen.getByText("Half Day")).toBeDefined();
  });

  it("renders existing exceptions list", () => {
    render(<CalendarExceptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Existing Exceptions")).toBeDefined();
  });

  it("renders reason textarea", () => {
    render(<CalendarExceptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. New Year's Day, Company Holiday...")).toBeDefined();
  });

  it("renders action buttons", () => {
    render(<CalendarExceptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("+ Add Exception")).toBeDefined();
  });
});
