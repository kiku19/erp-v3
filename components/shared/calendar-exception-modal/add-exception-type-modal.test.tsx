import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AddExceptionTypeModal } from "./add-exception-type-modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("AddExceptionTypeModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  it("renders nothing when open is false", () => {
    render(<AddExceptionTypeModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with title when open", () => {
    render(<AddExceptionTypeModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Exception Type")).toBeDefined();
  });

  it("renders name input and color options", () => {
    render(<AddExceptionTypeModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("e.g. Company Event, Maintenance...")).toBeDefined();
    expect(screen.getByText("Red")).toBeDefined();
    expect(screen.getByText("Blue")).toBeDefined();
    expect(screen.getByText("Green")).toBeDefined();
  });

  it("Add Type button is disabled when name is empty", () => {
    render(<AddExceptionTypeModal {...defaultProps} />);
    const btn = screen.getByText("Add Type").closest("button");
    expect(btn?.disabled).toBe(true);
  });

  it("calls onSave with name and color when form submitted", () => {
    const onSave = vi.fn();
    render(<AddExceptionTypeModal {...defaultProps} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Company Event, Maintenance..."), { target: { value: "Custom Type" } });
    fireEvent.click(screen.getByText("Green")); // Select green color
    fireEvent.click(screen.getByText("Add Type"));
    expect(onSave).toHaveBeenCalledWith({ name: "Custom Type", color: "success" });
  });

  it("calls onClose when clicking Cancel", () => {
    const onClose = vi.fn();
    render(<AddExceptionTypeModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
