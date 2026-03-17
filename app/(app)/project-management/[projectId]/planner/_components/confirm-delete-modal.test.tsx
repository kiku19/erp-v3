import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

describe("ConfirmDeleteModal", () => {
  const defaultProps = {
    open: true,
    wbsName: "Engineering",
    childCount: 3,
    activityCount: 12,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders modal with WBS name", () => {
    render(<ConfirmDeleteModal {...defaultProps} />);
    expect(screen.getByText(/Engineering/)).toBeDefined();
    expect(screen.getByText("Delete WBS Folder")).toBeDefined();
  });

  it("shows child folder and activity counts", () => {
    render(<ConfirmDeleteModal {...defaultProps} />);
    expect(screen.getByText("3 child folders")).toBeDefined();
    expect(screen.getByText("12 activities")).toBeDefined();
  });

  it("hides descendant info when counts are zero", () => {
    render(<ConfirmDeleteModal {...defaultProps} childCount={0} activityCount={0} />);
    expect(screen.queryByText(/child folder/)).toBeNull();
    expect(screen.queryByText(/activit/)).toBeNull();
  });

  it("shows singular 'folder' for childCount=1", () => {
    render(<ConfirmDeleteModal {...defaultProps} childCount={1} activityCount={1} />);
    expect(screen.getByText(/child folder(?!s)/)).toBeDefined();
    expect(screen.getByText(/activity(?!i)/)).toBeDefined();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onConfirm with false when Delete is clicked without checkbox", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm with true when checkbox is checked and Delete is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteModal {...defaultProps} onConfirm={onConfirm} />);

    // Check the "Don't ask me again" checkbox
    const checkbox = screen.getByLabelText("Don't ask me again");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("does not render when open is false", () => {
    render(<ConfirmDeleteModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Delete WBS Folder")).toBeNull();
  });

  it("shows undo hint text", () => {
    render(<ConfirmDeleteModal {...defaultProps} />);
    expect(screen.getByText(/Ctrl\+Z/)).toBeDefined();
  });

  it("calls onCancel when close button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
