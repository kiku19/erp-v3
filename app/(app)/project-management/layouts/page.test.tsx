import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock useAuth
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "test-token" }),
}));

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LayoutsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders loading state initially", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    const { default: LayoutsPage } = await import("./page");
    render(<LayoutsPage />);
    expect(screen.getByText("Loading layouts...")).toBeDefined();
  });

  it("renders empty state when no layouts", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    const { default: LayoutsPage } = await import("./page");
    render(<LayoutsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no layouts saved yet/i)).toBeDefined();
    });
  });

  it("renders layout list when data exists", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        layouts: [
          { id: "l1", name: "Metro Rail Template", description: "Template from metro", sourceProjectId: "p1", createdAt: "2025-01-06T00:00:00.000Z" },
          { id: "l2", name: "Bridge Template", description: "", sourceProjectId: "p2", createdAt: "2025-02-01T00:00:00.000Z" },
        ],
      }), { status: 200 }),
    );
    const { default: LayoutsPage } = await import("./page");
    render(<LayoutsPage />);
    await waitFor(() => {
      expect(screen.getByText("Metro Rail Template")).toBeDefined();
      expect(screen.getByText("Bridge Template")).toBeDefined();
    });
  });

  it("renders page heading", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ layouts: [] }), { status: 200 }),
    );
    const { default: LayoutsPage } = await import("./page");
    render(<LayoutsPage />);
    const headings = screen.getAllByRole("heading", { name: "Project Layouts" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
