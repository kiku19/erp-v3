import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordStrength } from "./password-strength";

describe("PasswordStrength", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Weak' for short password with only lowercase", () => {
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText("Weak")).toBeDefined();
  });

  it("shows 'Fair' for a password with lowercase + length >= 8", () => {
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText("Fair")).toBeDefined();
  });

  it("shows 'Good' for a password with lowercase + uppercase + length", () => {
    render(<PasswordStrength password="Abcdefgh" />);
    expect(screen.getByText("Good")).toBeDefined();
  });

  it("shows 'Strong' for a password meeting all criteria", () => {
    const { container } = render(<PasswordStrength password="Abcdef1!" />);
    const label = container.querySelector("span");
    expect(label?.textContent).toBe("Strong");
  });

  it("renders 4 bar segments", () => {
    const { container } = render(<PasswordStrength password="a" />);
    const segments = container.querySelectorAll("[data-testid='strength-segment']");
    expect(segments).toHaveLength(4);
  });

  it("has accessible role", () => {
    const { container } = render(<PasswordStrength password="test" />);
    const statusEl = container.querySelector("[role='status']");
    expect(statusEl).toBeTruthy();
  });
});
