import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./auth-context";

function TestConsumer() {
  const { isAuthenticated, isLoading, tenant } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="tenant">{tenant?.email ?? "none"}</span>
    </div>
  );
}

function LoginConsumer() {
  const { login, isLoading } = useAuth();
  return (
    <button
      onClick={() => login("admin@acme.com", "securepass123")}
      disabled={isLoading}
    >
      Login
    </button>
  );
}

function LogoutConsumer() {
  const { logout } = useAuth();
  return <button onClick={() => logout()}>Logout</button>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("throws when useAuth is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    spy.mockRestore();
  });

  it("starts with isLoading=true, then resolves to isAuthenticated=false when refresh fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "No refresh token" }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });

  it("login() calls API and sets authenticated state", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "test-token",
            tenant: {
              id: "t-1",
              tenantName: "Acme",
              email: "admin@acme.com",
              role: "admin",
            },
          }),
      });

    render(
      <AuthProvider>
        <LoginConsumer />
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      await user.click(screen.getByText("Login"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
      expect(screen.getByTestId("tenant").textContent).toBe("admin@acme.com");
    });
  });

  it("logout() calls API and clears authenticated state", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "test-token",
            tenant: {
              id: "t-1",
              tenantName: "Acme",
              email: "admin@acme.com",
              role: "admin",
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Logged out" }),
      });

    render(
      <AuthProvider>
        <LogoutConsumer />
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      await user.click(screen.getByText("Logout"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
      expect(screen.getByTestId("tenant").textContent).toBe("none");
    });
  });
});
