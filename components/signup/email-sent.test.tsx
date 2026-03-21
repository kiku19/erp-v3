import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EmailSent } from "./email-sent";

afterEach(cleanup);

describe("EmailSent", () => {
  const defaultProps = {
    email: "john@acme.com",
    onResend: vi.fn(),
    onChangeEmail: vi.fn(),
  };

  it("renders heading", () => {
    render(<EmailSent {...defaultProps} />);
    expect(screen.getByText("Check your inbox")).toBeDefined();
  });

  it("shows the submitted email", () => {
    render(<EmailSent {...defaultProps} />);
    expect(screen.getByText("john@acme.com")).toBeDefined();
  });

  it("renders mail icon", () => {
    const { container } = render(<EmailSent {...defaultProps} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("calls onResend when resend button is clicked", () => {
    render(<EmailSent {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /resend email/i }));
    expect(defaultProps.onResend).toHaveBeenCalled();
  });

  it("calls onChangeEmail when change email button is clicked", () => {
    render(<EmailSent {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /change email/i }));
    expect(defaultProps.onChangeEmail).toHaveBeenCalled();
  });

  it("shows resending state", () => {
    render(<EmailSent {...defaultProps} isResending />);
    expect(screen.getByText(/Sending/)).toBeDefined();
  });

  it("mentions link expiry", () => {
    render(<EmailSent {...defaultProps} />);
    expect(screen.getByText(/24 hours/)).toBeDefined();
  });
});
