import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SaveLayoutModal } from "./save-layout-modal";

/** Helper: get the dialog element and scope queries inside it */
function getDialog() {
  const dialogs = screen.getAllByRole("dialog");
  return within(dialogs[0]);
}

describe("SaveLayoutModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    projectId: "proj-1",
    accessToken: "test-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<SaveLayoutModal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal with name and description inputs when open", () => {
    render(<SaveLayoutModal {...defaultProps} />);
    expect(screen.getAllByRole("dialog").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Layout Name")).toBeDefined();
    expect(screen.getByLabelText("Description")).toBeDefined();
  });

  it("disables save button when name is empty", () => {
    render(<SaveLayoutModal {...defaultProps} />);
    const dialog = getDialog();
    const saveBtn = dialog.getByRole("button", { name: /save layout/i });
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables save button when name is entered", () => {
    render(<SaveLayoutModal {...defaultProps} />);
    const input = screen.getByLabelText("Layout Name");
    fireEvent.change(input, { target: { value: "My Layout" } });
    const dialog = getDialog();
    const saveBtn = dialog.getByRole("button", { name: /save layout/i });
    expect(saveBtn.hasAttribute("disabled")).toBe(false);
  });

  it("calls API and closes on successful save", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "layout-1", name: "My Layout" }), { status: 201 }),
    );

    render(<SaveLayoutModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Layout Name"), { target: { value: "My Layout" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A description" } });
    const dialog = getDialog();
    fireEvent.click(dialog.getByRole("button", { name: /save layout/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/planner/layouts", expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }));
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Server error" }), { status: 500 }),
    );

    render(<SaveLayoutModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Layout Name"), { target: { value: "My Layout" } });
    const dialog = getDialog();
    fireEvent.click(dialog.getByRole("button", { name: /save layout/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to save layout/i)).toBeDefined();
    });
  });

  it("calls onClose when cancel is clicked", () => {
    render(<SaveLayoutModal {...defaultProps} />);
    const dialog = getDialog();
    fireEvent.click(dialog.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
