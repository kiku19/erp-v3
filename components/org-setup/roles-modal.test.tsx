import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { RolesModal, RolesSearchModal, DeleteRoleModal } from "./roles-modal";
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
    json: () => Promise.resolve({ role: { id: "api-role-1" } }),
  });
});

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <OrgSetupProvider companyName="Test Corp">{ui}</OrgSetupProvider>,
  );
}

/* ─────────────────────── RolesModal ──────────────────────────────── */

describe("RolesModal", () => {
  it("renders when open", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("roles-modal")).toBeDefined();
    expect(screen.getByText("Roles")).toBeDefined();
    expect(screen.getByText("All Roles")).toBeDefined();
  });

  it("does not render when closed", () => {
    renderWithProvider(<RolesModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("roles-modal")).toBeNull();
  });

  it("shows create form directly when no roles exist", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("No roles created yet")).toBeDefined();
    expect(screen.getByText("New Role")).toBeDefined();
    expect(screen.getByTestId("role-name-input")).toBeDefined();
  });

  it("opens create form when add button clicked", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);
    const addBtn = screen.getByLabelText("Add new role");
    fireEvent.click(addBtn);
    expect(screen.getByText("New Role")).toBeDefined();
    expect(screen.getByTestId("role-name-input")).toBeDefined();
  });

  it("auto-generates code when name is typed", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);

    const nameInput = screen.getByTestId("role-name-input");
    fireEvent.change(nameInput, { target: { value: "Senior Painter" } });

    const codeInput = screen.getByTestId("role-code-input") as HTMLInputElement;
    expect(codeInput.value).toBe("SENI-PA");
  });

  it("calls API and saves role on form submit", async () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("role-name-input"), {
      target: { value: "Electrician" },
    });

    fireEvent.click(screen.getByTestId("save-role-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/roles",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("renders cost range section in create form", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Cost Range")).toBeDefined();
    expect(screen.getByTestId("cost-rate-min-input")).toBeDefined();
    expect(screen.getByTestId("cost-rate-max-input")).toBeDefined();
  });

  it("includes cost range fields in API call on save", async () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("role-name-input"), {
      target: { value: "Project Manager" },
    });

    const minInput = screen.getByTestId("cost-rate-min-input");
    const maxInput = screen.getByTestId("cost-rate-max-input");
    fireEvent.change(minInput, { target: { value: "80" } });
    fireEvent.change(maxInput, { target: { value: "120" } });

    fireEvent.click(screen.getByTestId("save-role-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/roles",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"costRateMin":80'),
        }),
      );
    });
  });

  it("shows search modal when search button clicked", () => {
    renderWithProvider(<RolesModal open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Search roles"));
    expect(screen.getByTestId("spotlight-search")).toBeDefined();
  });
});

/* ─────────────────────── RolesSearchModal ────────────────────────── */

describe("RolesSearchModal", () => {
  const roles = [
    { id: "r1", name: "Painter", code: "PNT-01", level: "Senior" as const, defaultPayType: "hourly" as const, overtimeEligible: true, skillTags: [], costRateMin: null, costRateMax: null, costRateCurrency: null },
    { id: "r2", name: "Electrician", code: "ELC-01", level: "Mid" as const, defaultPayType: "salaried" as const, overtimeEligible: false, skillTags: [], costRateMin: 50, costRateMax: 80, costRateCurrency: "USD" },
  ];

  it("renders search input and results", () => {
    render(
      <RolesSearchModal
        open={true}
        onClose={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        roles={roles}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Search Roles")).toBeDefined();
    expect(screen.getByText("Painter")).toBeDefined();
    expect(screen.getByText("Electrician")).toBeDefined();
  });

  it("calls onSelect when result clicked", () => {
    const onSelect = vi.fn();
    render(
      <RolesSearchModal
        open={true}
        onClose={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        roles={roles}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Painter"));
    expect(onSelect).toHaveBeenCalledWith(roles[0]);
  });
});

/* ─────────────────────── DeleteRoleModal ─────────────────────────── */

describe("DeleteRoleModal", () => {
  it("renders with role name", () => {
    render(
      <DeleteRoleModal
        open={true}
        roleName="Painter"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Delete Role")).toBeDefined();
    expect(screen.getByText("Painter")).toBeDefined();
  });

  it("calls onConfirm when delete clicked", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteRoleModal
        open={true}
        roleName="Painter"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel clicked", () => {
    const onCancel = vi.fn();
    render(
      <DeleteRoleModal
        open={true}
        roleName="Painter"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
