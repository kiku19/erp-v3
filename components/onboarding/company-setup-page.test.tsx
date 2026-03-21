import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { CompanySetupPage } from "./company-setup-page";

afterEach(cleanup);

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSetTokens = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    setTokens: mockSetTokens,
    isAuthenticated: false,
  }),
}));

describe("CompanySetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn().mockReturnValue("tenant-123"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "tok",
        tenant: { id: "t1", tenantName: "Acme", email: "a@b.com", role: "admin" },
        user: { id: "u1", name: "Alice", email: "a@b.com", role: "admin" },
      }),
    }));
  });

  it("renders company setup form", () => {
    render(<CompanySetupPage />);
    expect(screen.getByText("Set up your company")).toBeDefined();
  });

  it("redirects to onboarding-missing when no tenantId in sessionStorage", async () => {
    (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    render(<CompanySetupPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signup");
    });
  });
});
