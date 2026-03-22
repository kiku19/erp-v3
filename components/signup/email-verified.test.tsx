import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EmailVerified } from "./email-verified";

afterEach(cleanup);

describe("EmailVerified", () => {
  const onContinue = vi.fn();

  it("renders heading", () => {
    render(<EmailVerified onContinue={onContinue} />);
    expect(screen.getByText("Email verified!")).toBeDefined();
  });

  it("renders success message", () => {
    render(<EmailVerified onContinue={onContinue} />);
    expect(screen.getByText(/successfully verified/)).toBeDefined();
  });

  it("renders verified icon", () => {
    const { container } = render(<EmailVerified onContinue={onContinue} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("calls onContinue when button is clicked", () => {
    render(<EmailVerified onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("mentions company setup details", () => {
    render(<EmailVerified onContinue={onContinue} />);
    expect(screen.getByText(/company name/)).toBeDefined();
  });
});
