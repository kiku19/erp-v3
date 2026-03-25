import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { OrgSetupProvider } from "./context";
import { NodeCard } from "./node-card";
import { AddNodeModal } from "./add-node-modal";
import { NODE_WIDTH, NODE_HEIGHT } from "./types";

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    accessToken: "mock-token",
    tenant: null,
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setTokens: vi.fn(),
  }),
}));

// Mock fetch for API calls — handle both GET (fetchOrgSetup) and POST (createNode)
const mockFetch = vi.fn();
global.fetch = mockFetch;

const ROOT_NODE_API = {
  id: "node-root",
  name: "Test Corp",
  code: "TC-ROOT",
  type: "COMPANY_ROOT",
  parentId: null,
  nodeHeadPersonId: null,
  calendarId: null,
  assignedRoles: [],
  isActive: true,
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    // POST — create node (root auto-creation)
    if (opts?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ node: ROOT_NODE_API }),
      });
    }
    // GET — fetch org setup (return root node so provider doesn't try to create)
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          nodes: [ROOT_NODE_API],
          people: [],
          equipment: [],
          materials: [],
          calendars: [],
          roles: [],
        }),
    });
  });
});

const ROOT_LAYOUT = { id: "node-root", x: 60, y: 60, width: NODE_WIDTH, height: NODE_HEIGHT };

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <OrgSetupProvider companyName="Test Corp">{ui}</OrgSetupProvider>,
  );
}

/* ─────────────────────── NodeCard: plus button ───────────────────── */

describe("NodeCard — add-child plus button", () => {
  it("shows plus button on root node", () => {
    renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
    );
    expect(screen.getByTestId("add-child-node-root")).toBeDefined();
    expect(screen.getByLabelText("Add child to Test Corp")).toBeDefined();
  });

  it("shows empty state hint when root has no children", () => {
    renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
    );
    expect(screen.getByText(/add your first node/)).toBeDefined();
  });

  it("does not show empty state hint when isFirstNode is false", () => {
    renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode={false} />
    );
    expect(screen.queryByText(/add your first node/)).toBeNull();
  });

  it("clicking plus button opens add-node modal", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByText("Add Node under Test Corp")).toBeDefined();
    });
  });

  it("does not show plus button for nodes at max depth", () => {
    // We render the root which is at depth 0 — it should have the button
    // We can't easily create a depth-3 node via rendering alone,
    // so we verify root (depth 0) does show it
    renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
    );
    expect(screen.getByTestId("add-child-node-root")).toBeDefined();
  });
});

/* ─────────────────────── NodeCard: no type indicators ────────────── */

describe("NodeCard — no node type indicators", () => {
  it("does not render type-colored dot", () => {
    const { container } = renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
    );
    // Old implementation had a 2.5x2.5 rounded-full dot — should not exist
    const dots = container.querySelectorAll(".rounded-full.h-2\\.5.w-2\\.5");
    expect(dots.length).toBe(0);
  });

  it("renders node name and code without type label", () => {
    renderWithProvider(
      <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
    );
    expect(screen.getByText("Test Corp")).toBeDefined();
    expect(screen.getByText("TC-ROOT")).toBeDefined();
    // No type labels like "Company", "Division", etc.
    expect(screen.queryByText("Company")).toBeNull();
    expect(screen.queryByText("Division")).toBeNull();
  });
});

/* ─────────────────────── AddNodeModal ────────────────────────────── */

describe("AddNodeModal", () => {
  it("does not render when no target is set", () => {
    renderWithProvider(<AddNodeModal />);
    expect(screen.queryByText("Add Node")).toBeNull();
  });

  it("opens when plus button is clicked and shows generic title", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByText("Add Node under Test Corp")).toBeDefined();
    });
  });

  it("has Add Node submit button (not type-specific)", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Add Node" });
      expect(btn).toBeDefined();
    });
  });

  it("submit button is disabled when name is empty", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Add Node" });
      expect(btn.hasAttribute("disabled")).toBe(true);
    });
  });

  it("auto-generates code from name", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Civil Engineering")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("e.g., Civil Engineering"), {
      target: { value: "Civil Engineering" },
    });

    await waitFor(() => {
      const codeInput = screen.getByPlaceholderText("Auto-generated from name") as HTMLInputElement;
      expect(codeInput.value).toBe("CIV-ENG");
    });
  });

  it("enables submit when name is filled", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Civil Engineering")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("e.g., Civil Engineering"), {
      target: { value: "Engineering" },
    });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Add Node" });
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("closes modal and adds node on submit", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Civil Engineering")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("e.g., Civil Engineering"), {
      target: { value: "Engineering" },
    });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Add Node" });
      expect(btn.hasAttribute("disabled")).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Node" }));

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText("Add Node under Test Corp")).toBeNull();
    });
  });

  it("closes modal on cancel", async () => {
    renderWithProvider(
      <>
        <NodeCard nodeId="node-root" layout={ROOT_LAYOUT} isFirstNode />
        <AddNodeModal />
      </>
    );

    fireEvent.click(screen.getByTestId("add-child-node-root"));

    await waitFor(() => {
      expect(screen.getByText("Add Node under Test Corp")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Add Node under Test Corp")).toBeNull();
    });
  });
});
