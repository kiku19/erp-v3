export {};

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { AuthProvider } from "@/contexts/auth-context";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
let mockGetSearchParam = jest.fn().mockReturnValue(null);
let mockSetAccessToken = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => mockGetSearchParam(key) }),
}));

jest.mock("@/contexts/auth-context", () => ({
  ...jest.requireActual("@/contexts/auth-context"),
  useAuthContext: () => ({
    setAccessToken: mockSetAccessToken,
    accessToken: null,
    isAuthenticated: false,
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

// "Password" (exact) matches the <label> element → the input.
// "/password/i" (regex) also matches the eye-button's aria-label="Show password",
// so always use exact label text when querying the input.
const getPasswordInput = () => screen.getByLabelText("Password");
const getUsernameInput = () => screen.getByLabelText("Username");

function makeSuccessResponse(defaultRedirectPath = "/dashboard") {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        accessToken: "test-access-token",
        expiresIn: 3600,
        user: {
          id: "user-uuid",
          username: "admin",
          tenantId: "tenant-uuid",
          role: "admin",
          permissions: ["users:read"],
          timezone: "UTC",
          defaultRedirectPath,
        },
      },
    }),
  };
}

function makeErrorResponse(status: number, code: string, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({
      success: false,
      error: { code, message },
      traceId: "trace-uuid-123",
    }),
  };
}

// Helper to render with AuthProvider
function renderWithAuthProvider(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  global.fetch = jest.fn();
  mockSetAccessToken.mockClear();
  // Default: no ?redirect param in URL
  mockGetSearchParam.mockReturnValue(null);
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("LoginPage — Rendering", () => {
  it("renders the username input", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(getUsernameInput()).toBeInTheDocument();
  });

  it("renders the password input", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(getPasswordInput()).toBeInTheDocument();
  });

  it("renders the Login submit button", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
  });

  it("renders the brand headline", () => {
    renderWithAuthProvider(<LoginPage />);
    // jsdom's textContent omits the <br> whitespace → "Design for thefuture."
    // Use \s* to allow zero or more spaces between words split by <br>.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/design for the\s*future/i);
  });

  it("renders the Acme Corp logo text", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the page form heading 'Login'", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Login");
  });

  it("password input is hidden (type=password) by default", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });

  it("does not show an error alert on initial render", () => {
    renderWithAuthProvider(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage — Password visibility toggle", () => {
  it("shows password when eye toggle is clicked", async () => {
    const user = userEvent.setup();
    renderWithAuthProvider(<LoginPage />);

    expect(getPasswordInput()).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "text");
  });

  it("hides password again on second click", async () => {
    const user = userEvent.setup();
    renderWithAuthProvider(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage — Successful login", () => {
  async function submitValidForm() {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeSuccessResponse());

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  }

  it("stores accessToken in AuthContext (memory), NOT in localStorage", async () => {
    await submitValidForm();
    await waitFor(() => expect(mockSetAccessToken).toHaveBeenCalledWith("test-access-token"));
    // Verify NOT stored in localStorage
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("stores userRole in localStorage", async () => {
    await submitValidForm();
    await waitFor(() => expect(localStorage.getItem("userRole")).toBe("admin"));
  });

  it("stores userPermissions in localStorage", async () => {
    await submitValidForm();
    await waitFor(() => {
      const permissions = localStorage.getItem("userPermissions");
      expect(permissions).toBe(JSON.stringify(["users:read"]));
    });
  });

  it("does NOT store refreshToken in localStorage (it's in HttpOnly cookie)", async () => {
    await submitValidForm();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("redirects to defaultRedirectPath after successful login (no redirect param)", async () => {
    await submitValidForm();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects to the ?redirect param when present", async () => {
    const user = userEvent.setup();
    mockGetSearchParam.mockImplementation((key: string) =>
      key === "redirect" ? "/custom-path" : null
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeSuccessResponse());

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/custom-path"));
  });

  it("uses defaultRedirectPath for superadmin (/admin-panel)", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeSuccessResponse("/admin-panel"));

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "superadmin");
    await user.type(getPasswordInput(), "superadmin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin-panel"));
  });

  it("does not show an error alert on success", async () => {
    await submitValidForm();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage — Error handling", () => {
  it("shows error message on 401 invalid credentials", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "INVALID_CREDENTIALS", "Invalid username or password")
    );

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid username or password")
    );
  });

  it("does not store tokens on failed login", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "INVALID_CREDENTIALS", "Invalid username or password")
    );

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "bad");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(mockSetAccessToken).not.toHaveBeenCalled();
  });

  it("does not redirect on failed login", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "INVALID_CREDENTIALS", "Invalid username or password")
    );

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "bad");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a network error message when fetch throws", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/unable to connect/i)
    );
  });

  it("shows fallback message when API returns no error message", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: {}, traceId: "t" }),
    });

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/login failed/i)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage — Loading state", () => {
  it("disables the submit button while the request is in-flight", async () => {
    const user = userEvent.setup();
    // Promise that never resolves — keeps the loading state alive for the assertion
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    const button = await screen.findByRole("button", { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it("changes button text to 'Signing in…' while the request is in-flight", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    expect(await screen.findByText(/signing in/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage — Kong routing enforcement", () => {
  // Submits the form and returns the captured fetch arguments
  async function captureRequest() {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeSuccessResponse());

    renderWithAuthProvider(<LoginPage />);
    await user.type(getUsernameInput(), "admin");
    await user.type(getPasswordInput(), "admin123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> }
    ];
    return { url, options };
  }

  it("calls the Kong base URL — never the app server", async () => {
    const { url } = await captureRequest();
    expect(url).toContain("http://localhost:8000");
  });

  it("calls the correct login endpoint path through Kong", async () => {
    const { url } = await captureRequest();
    expect(url).toContain("/api/public/auth/login");
  });

  it("never calls localhost:3002 (Next.js app server) directly", async () => {
    const { url } = await captureRequest();
    expect(url).not.toMatch(/localhost:3002/);
  });

  it("never uses a relative URL", async () => {
    const { url } = await captureRequest();
    expect(url).not.toMatch(/^\/api/);
  });

  it("uses POST method", async () => {
    const { options } = await captureRequest();
    expect(options.method).toBe("POST");
  });

  it("sends Content-Type: application/json header", async () => {
    const { options } = await captureRequest();
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("sends a non-empty X-Timezone header", async () => {
    const { options } = await captureRequest();
    expect(options.headers["X-Timezone"]).toBeTruthy();
    expect(typeof options.headers["X-Timezone"]).toBe("string");
  });

  it("sends username and password in the JSON request body", async () => {
    const { options } = await captureRequest();
    const body = JSON.parse(options.body as string);
    expect(body.username).toBe("admin");
    expect(body.password).toBe("admin123");
  });

  it("includes credentials: 'include' for cookie handling", async () => {
    const { options } = await captureRequest();
    expect(options.credentials).toBe("include");
  });
});
