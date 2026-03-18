import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { LayoutsModal } from "./layouts-modal";

function getDialog() {
  const dialogs = screen.getAllByRole("dialog");
  return within(dialogs[0]);
}

describe("LayoutsModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    accessToken: "test-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<LayoutsModal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal with heading when open", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    render(<LayoutsModal {...defaultProps} />);
    const dialog = getDialog();
    expect(dialog.getByText("Project Layouts")).toBeDefined();
  });

  it("shows loading state initially", () => {
    vi.mocked(global.fetch).mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<LayoutsModal {...defaultProps} />);
    expect(screen.getByText("Loading layouts...")).toBeDefined();
  });

  it("shows empty state when no layouts", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    render(<LayoutsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/no layouts saved yet/i)).toBeDefined();
    });
  });

  it("renders layout rows when data exists", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        layouts: [
          { id: "l1", name: "Metro Rail Template", description: "From metro", sourceProjectId: "p1", createdAt: "2025-01-06T00:00:00.000Z" },
        ],
      }), { status: 200 }),
    );
    render(<LayoutsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Metro Rail Template")).toBeDefined();
    });
  });

  it("fetches layouts with auth header", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    render(<LayoutsModal {...defaultProps} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/planner/layouts", expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }));
    });
  });
});
