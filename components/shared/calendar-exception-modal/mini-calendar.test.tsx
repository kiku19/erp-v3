import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MiniCalendar } from "./mini-calendar";

afterEach(cleanup);

describe("MiniCalendar", () => {
  it("renders current month and year when no date selected", () => {
    render(<MiniCalendar selectedDate={null} onSelect={vi.fn()} />);
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    expect(screen.getByText(`${monthNames[now.getMonth()]} ${now.getFullYear()}`)).toBeDefined();
  });

  it("renders day name headers", () => {
    render(<MiniCalendar selectedDate={null} onSelect={vi.fn()} />);
    expect(screen.getAllByText("Sun").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Mon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sat").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates to selectedDate month", () => {
    const date = new Date(Date.UTC(2026, 2, 15)); // March 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    expect(screen.getByText("March 2026")).toBeDefined();
  });

  it("highlights selected day with primary bg", () => {
    const date = new Date(Date.UTC(2026, 2, 15)); // March 15, 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    const day15Buttons = screen.getAllByText("15");
    const selectedButton = day15Buttons.find((btn) => btn.className.includes("bg-primary"));
    expect(selectedButton).toBeDefined();
  });

  it("calls onSelect with UTC date when clicking a day", () => {
    const onSelect = vi.fn();
    const date = new Date(Date.UTC(2026, 2, 15));
    render(<MiniCalendar selectedDate={date} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("20"));
    expect(onSelect).toHaveBeenCalledWith(new Date(Date.UTC(2026, 2, 20)));
  });

  it("navigates to previous month", () => {
    const date = new Date(Date.UTC(2026, 2, 15)); // March 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("February 2026")).toBeDefined();
  });

  it("navigates to next month", () => {
    const date = new Date(Date.UTC(2026, 2, 15)); // March 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("April 2026")).toBeDefined();
  });

  it("wraps year when navigating past December", () => {
    const date = new Date(Date.UTC(2026, 11, 15)); // December 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("January 2027")).toBeDefined();
  });

  it("wraps year when navigating before January", () => {
    const date = new Date(Date.UTC(2026, 0, 15)); // January 2026
    render(<MiniCalendar selectedDate={date} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("December 2025")).toBeDefined();
  });
});
