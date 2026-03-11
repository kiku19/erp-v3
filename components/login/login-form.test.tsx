import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

afterEach(cleanup);

describe("LoginForm", () => {
  it("renders email input, password input, remember me checkbox, and sign in button", () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Email address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByText("Remember me for 30 days")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
  });

  it("renders Forgot password? link", () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByText("Forgot password?")).toBeDefined();
  });

  it("renders Sign up link", () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByText("Sign up")).toBeDefined();
  });

  it("shows validation error for invalid email on submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email address");
    await user.clear(emailInput);
    await user.type(emailInput, "bad-email");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeDefined();
    }, { timeout: 3000 });
  });

  it("shows validation error for short password on submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Email address"), "admin@acme.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeDefined();
    });
  });

  it("calls onSubmit with email, password, and rememberMe on valid submit", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText("Email address"), "admin@acme.com");
    await user.type(screen.getByLabelText("Password"), "securepass123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: "admin@acme.com",
        password: "securepass123",
        rememberMe: false,
      });
    });
  });

  it("disables button during loading state", () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading />);
    const btn = screen.getByRole("button", { name: /signing in/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("displays server error message", () => {
    render(
      <LoginForm onSubmit={vi.fn()} serverError="Invalid email or password" />,
    );
    expect(screen.getByText("Invalid email or password")).toBeDefined();
  });
});
