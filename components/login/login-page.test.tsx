import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LoginPage } from "./login-page";

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
    accessToken: null,
    tenant: null,
    logout: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  it("renders branding panel with logo and hero text", () => {
    render(<LoginPage />);
    expect(screen.getByText("Acme ERP")).toBeDefined();
    expect(screen.getByText(/Streamline your/)).toBeDefined();
  });

  it("renders feature bullets", () => {
    render(<LoginPage />);
    expect(screen.getByText("Real-time inventory tracking")).toBeDefined();
    expect(screen.getByText("Automated financial reporting")).toBeDefined();
    expect(screen.getByText("Multi-location support")).toBeDefined();
  });

  it("renders testimonial section", () => {
    render(<LoginPage />);
    expect(screen.getByText(/order processing time/)).toBeDefined();
    expect(screen.getByText("Sarah Chen")).toBeDefined();
  });

  it("renders form panel with login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeDefined();
    expect(screen.getByText("Enter your credentials to access your account")).toBeDefined();
    expect(screen.getByLabelText("Email address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });
});
