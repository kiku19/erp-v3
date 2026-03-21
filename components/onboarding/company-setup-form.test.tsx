import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanySetupForm } from "./company-setup-form";

afterEach(cleanup);

describe("CompanySetupForm", () => {
  const onSubmit = vi.fn();

  afterEach(() => vi.clearAllMocks());

  it("renders the form heading", () => {
    render(<CompanySetupForm onSubmit={onSubmit} />);
    expect(screen.getByText("Set up your company")).toBeDefined();
  });

  it("renders all required fields", () => {
    render(<CompanySetupForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText(/company name/i)).toBeDefined();
    expect(screen.getByText("Company Size")).toBeDefined();
    expect(screen.getByText("Industry")).toBeDefined();
    expect(screen.getByText("Your Role")).toBeDefined();
    expect(screen.getByText(/Country/)).toBeDefined();
    expect(screen.getByText("Currency")).toBeDefined();
  });

  it("renders the continue button", () => {
    render(<CompanySetupForm onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDefined();
  });

  it("shows validation error when company name is empty", async () => {
    render(<CompanySetupForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/company name must be at least/i)).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error when company name is too short", async () => {
    const user = userEvent.setup();
    render(<CompanySetupForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/company name/i), "A");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/company name must be at least/i)).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("displays server error", () => {
    render(<CompanySetupForm onSubmit={onSubmit} serverError="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("shows loading state on submit", () => {
    render(<CompanySetupForm onSubmit={onSubmit} isLoading />);
    expect(screen.getByRole("button", { name: /setting up/i })).toBeDefined();
  });

  it("disables button when loading", () => {
    render(<CompanySetupForm onSubmit={onSubmit} isLoading />);
    const btn = screen.getByRole("button", { name: /setting up/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
