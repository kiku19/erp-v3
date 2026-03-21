import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "./signup-form";

afterEach(cleanup);

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SignupForm", () => {
  const onSubmit = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SignupForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Work Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  it("renders heading", () => {
    render(<SignupForm onSubmit={onSubmit} />);
    expect(screen.getByText("Create your account")).toBeDefined();
  });

  it("renders sign in link", () => {
    render(<SignupForm onSubmit={onSubmit} />);
    const link = screen.getByText("Sign in");
    expect(link.closest("a")?.getAttribute("href")).toBe("/");
  });

  it("shows validation errors on empty submit", async () => {
    render(<SignupForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least/)).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows password strength indicator when typing password", async () => {
    const user = userEvent.setup();
    render(<SignupForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Password"), "Abc");
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("calls onSubmit with valid data", async () => {
    const user = userEvent.setup();
    render(<SignupForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Work Email"), "john@acme.com");
    await user.type(screen.getByLabelText("Password"), "Secure1!pass");
    await user.type(screen.getByLabelText("Confirm Password"), "Secure1!pass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: "John Doe",
        email: "john@acme.com",
        password: "Secure1!pass",
        confirmPassword: "Secure1!pass",
      });
    });
  });

  it("displays server error", () => {
    render(<SignupForm onSubmit={onSubmit} serverError="Email already taken" />);
    expect(screen.getByText("Email already taken")).toBeDefined();
  });

  it("shows loading state", () => {
    render(<SignupForm onSubmit={onSubmit} isLoading />);
    expect(screen.getByText(/Creating account/)).toBeDefined();
  });

  it("shows email exists error", () => {
    render(<SignupForm onSubmit={onSubmit} emailExists />);
    expect(screen.getByText(/already registered/)).toBeDefined();
  });
});
