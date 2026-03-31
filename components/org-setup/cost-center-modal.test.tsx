import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CostCenterModal, DeleteCostCenterModal } from "./cost-center-modal";
import { OrgSetupProvider } from "./context";

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

/* ─────────────────────── Mocks ───────────────────────────────────── */

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ costCenter: { id: "api-cc-1" } }),
  });
});

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <OrgSetupProvider companyName="Test Corp">{ui}</OrgSetupProvider>,
  );
}

/* ─────────────────────── CostCenterModal ────────────────────────── */

describe("CostCenterModal", () => {
  it("renders when open", () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("cost-center-modal")).toBeDefined();
    expect(screen.getByText("Cost Centers")).toBeDefined();
    expect(screen.getByText("All Cost Centers")).toBeDefined();
  });

  it("does not render when closed", () => {
    renderWithProvider(<CostCenterModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("cost-center-modal")).toBeNull();
  });

  it("shows create form directly when no cost centers exist", () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("No cost centers created yet")).toBeDefined();
    expect(screen.getByText("New Cost Center")).toBeDefined();
    expect(screen.getByTestId("cc-name-input")).toBeDefined();
  });

  it("opens create form when add button clicked", () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);
    const addBtn = screen.getByLabelText("Add new cost center");
    fireEvent.click(addBtn);
    expect(screen.getByText("New Cost Center")).toBeDefined();
    expect(screen.getByTestId("cc-name-input")).toBeDefined();
  });

  it("auto-generates code when name is typed", () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);

    const nameInput = screen.getByTestId("cc-name-input");
    fireEvent.change(nameInput, { target: { value: "Operations" } });

    const codeInput = screen.getByTestId("cc-code-input") as HTMLInputElement;
    expect(codeInput.value).toBe("OPER-01");
  });

  it("calls API and saves cost center on form submit", async () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("cc-name-input"), {
      target: { value: "Operations" },
    });

    fireEvent.click(screen.getByTestId("save-cc-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cost-centers",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("shows search modal when search button clicked", () => {
    renderWithProvider(<CostCenterModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Search cost centers"));
    expect(screen.getByTestId("spotlight-search")).toBeDefined();
  });
});

/* ─────────────────────── DeleteCostCenterModal ─────────────────── */

describe("DeleteCostCenterModal", () => {
  it("renders with cost center name", () => {
    render(
      <DeleteCostCenterModal
        open={true}
        name="Operations"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Delete Cost Center")).toBeDefined();
    expect(screen.getByText(/Operations/)).toBeDefined();
  });

  it("calls onConfirm when delete clicked", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteCostCenterModal
        open={true}
        name="Operations"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("confirm-delete-cc-btn"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel clicked", () => {
    const onCancel = vi.fn();
    render(
      <DeleteCostCenterModal
        open={true}
        name="Operations"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
