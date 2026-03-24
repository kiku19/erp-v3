import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupPage } from "./signup-page";

afterEach(cleanup);

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signup form initially", () => {
    render(<SignupPage />);
    expect(screen.getByText("Create your account")).toBeDefined();
  });

  it("renders inside AuthLayout with branding", () => {
    render(<SignupPage />);
    expect(screen.getAllByText("Opus E1").length).toBeGreaterThanOrEqual(1);
  });

  it("transitions to email-sent after successful signup", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: "Account created",
          email: "john@acme.com",
        }),
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Work Email"), "john@acme.com");
    await user.type(screen.getByLabelText("Password"), "Secure1!pass");
    await user.type(screen.getByLabelText("Confirm Password"), "Secure1!pass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeDefined();
    });
  });

  it("shows server error on failed signup", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          message: "This email is already registered",
        }),
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Work Email"), "john@acme.com");
    await user.type(screen.getByLabelText("Password"), "Secure1!pass");
    await user.type(screen.getByLabelText("Confirm Password"), "Secure1!pass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("This email is already registered")).toBeDefined();
    });
  });
});
