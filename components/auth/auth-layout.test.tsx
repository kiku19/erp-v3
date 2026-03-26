import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock ErpRobot — Canvas won't work in jsdom
vi.mock("./erp-robot", () => ({
  ErpRobot: () => <div data-testid="erp-robot-container" aria-hidden="true" />,
}));

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

  it("renders the 3D robot panel", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    expect(screen.getByTestId("erp-robot-container")).toBeDefined();
  });

  it("robot panel has hidden-on-mobile class", () => {
    render(<AuthLayout><p>Test</p></AuthLayout>);
    const robotPanel = screen.getByTestId("erp-robot-container")
      .closest("[data-testid='robot-panel']");
    expect(robotPanel).toBeTruthy();
    expect(robotPanel!.className).toContain("hidden");
    expect(robotPanel!.className).toContain("md:flex");
  });

  it("card has constrained max-width", () => {
    render(<AuthLayout><p data-testid="child">Hello</p></AuthLayout>);
    const card = screen.getByTestId("auth-card");
    expect(card.className).toContain("max-w-[440px]");
  });
});
