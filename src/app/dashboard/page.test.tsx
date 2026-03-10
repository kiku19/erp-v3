export {};

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { AuthProvider } from "@/contexts/auth-context";

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth to return authenticated state with admin role
const mockUseAuthReturn = {
  isAuthenticated: true,
  role: "admin" as const,
  permissions: ["users:read"],
  hasRole: (roles: string[]) => roles.includes("admin"),
  hasPermission: (perm: string) => perm === "users:read",
  logout: mockLogout,
};

jest.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuthReturn,
}));

// Helper to render with AuthProvider
function renderWithAuthProvider(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  // Restore default authenticated admin state after each reset
  mockUseAuthReturn.isAuthenticated = true;
  mockUseAuthReturn.role = "admin";
  mockUseAuthReturn.hasRole = (roles: string[]) => roles.includes("admin");
  mockUseAuthReturn.logout = mockLogout;
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("DashboardPage — Rendering", () => {
  it("renders the Dashboard heading", () => {
    renderWithAuthProvider(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dashboard");
  });

  it("renders the ERP brand name in the header", () => {
    renderWithAuthProvider(<DashboardPage />);
    expect(screen.getByText(/Acme Corp ERP/i)).toBeInTheDocument();
  });

  it("renders the welcome message", () => {
    renderWithAuthProvider(<DashboardPage />);
    expect(screen.getByText(/welcome to the erp dashboard/i)).toBeInTheDocument();
  });

  it("renders the Logout button", () => {
    renderWithAuthProvider(<DashboardPage />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});

// ── Auth guard ────────────────────────────────────────────────────────────────

describe("DashboardPage — Auth guard", () => {
  it("redirects to /login if not authenticated", async () => {
    // Override mock to return unauthenticated state
    mockUseAuthReturn.isAuthenticated = false;
    mockUseAuthReturn.hasRole = () => false;

    renderWithAuthProvider(<DashboardPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("does not redirect when authenticated as admin", async () => {
    renderWithAuthProvider(<DashboardPage />);
    // Allow useEffect to run — push should not be called for a valid admin
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe("DashboardPage — Logout", () => {
  it("calls logout from useAuth when logout button is clicked", async () => {
    const user = userEvent.setup();
    renderWithAuthProvider(<DashboardPage />);

    await user.click(screen.getByRole("button", { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("clears userRole from localStorage on logout", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userPermissions", '["users:read"]');

    // Restore real logout behaviour for this test
    mockUseAuthReturn.logout = jest.fn().mockImplementation(() => {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userPermissions");
      mockPush("/login");
    });

    renderWithAuthProvider(<DashboardPage />);
    await user.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem("userRole")).toBeNull();
  });

  it("clears userPermissions from localStorage on logout", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userPermissions", '["users:read"]');

    mockUseAuthReturn.logout = jest.fn().mockImplementation(() => {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userPermissions");
      mockPush("/login");
    });

    renderWithAuthProvider(<DashboardPage />);
    await user.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem("userPermissions")).toBeNull();
  });

  it("redirects to /login after logout", async () => {
    const user = userEvent.setup();

    mockUseAuthReturn.logout = jest.fn().mockImplementation(() => {
      mockPush("/login");
    });

    renderWithAuthProvider(<DashboardPage />);
    await user.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });
});
