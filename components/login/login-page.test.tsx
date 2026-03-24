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

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
    expect(screen.getAllByText("Opus E1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Streamline your/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders feature bullets", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("Real-time inventory tracking").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Automated financial reporting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Multi-location support").length).toBeGreaterThanOrEqual(1);
  });

  it("renders testimonial section", () => {
    render(<LoginPage />);
    expect(screen.getAllByText(/order processing time/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sarah Chen").length).toBeGreaterThanOrEqual(1);
  });

  it("renders form panel with login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeDefined();
    expect(screen.getByText("Enter your credentials to access your account")).toBeDefined();
    expect(screen.getByLabelText("Email address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });
});
