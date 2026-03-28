import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthLayout } from "./auth-layout";

afterEach(cleanup);

describe("AuthLayout", () => {
  it("renders children inside the auth card", () => {
    render(<AuthLayout><p>Test content</p></AuthLayout>);
    expect(screen.getByText("Test content")).toBeDefined();
  });

  it("wraps children in glassmorphic card", () => {
    render(<AuthLayout><p data-testid="child">Hello</p></AuthLayout>);
    const child = screen.getByTestId("child");
    const card = child.closest("[data-testid='auth-card']");
    expect(card).toBeTruthy();
  });

  it("renders the animated background", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getByTestId("auth-background")).toBeDefined();
  });

  it("card has constrained max-width", () => {
    render(<AuthLayout><p data-testid="child">Hello</p></AuthLayout>);
    const card = screen.getByTestId("auth-card");
    expect(card.className).toContain("max-w-[440px]");
  });
});
