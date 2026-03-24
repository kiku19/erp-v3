import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthLayout } from "./auth-layout";

afterEach(cleanup);

describe("AuthLayout", () => {
  it("renders children in the form panel", () => {
    render(<AuthLayout><p>Test content</p></AuthLayout>);
    expect(screen.getByText("Test content")).toBeDefined();
  });

  it("renders branding panel with logo", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getAllByText("Opus E1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders hero heading", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getAllByText(/Streamline your/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders features list", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getAllByText("Real-time inventory tracking").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Automated financial reporting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Multi-location support").length).toBeGreaterThanOrEqual(1);
  });

  it("renders testimonial", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getAllByText("Sarah Chen").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile logo", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    const logos = screen.getAllByText("Opus E1");
    expect(logos.length).toBeGreaterThanOrEqual(2);
  });

  it("wraps children in glassmorphic card", () => {
    render(<AuthLayout><p data-testid="child">Hello</p></AuthLayout>);
    const child = screen.getByTestId("child");
    const card = child.closest("[data-testid='auth-card']");
    expect(card).toBeTruthy();
  });
});
