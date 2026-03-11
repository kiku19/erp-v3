import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Badge } from "./badge";

afterEach(cleanup);

describe("Badge", () => {
  it("renders with default variant (bg-primary, text-primary-foreground, rounded-full)", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-primary");
    expect(badge.className).toContain("text-primary-foreground");
    expect(badge.className).toContain("rounded-full");
  });

  it("renders secondary variant", () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText("Secondary");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).toContain("text-secondary-foreground");
  });

  it("renders outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge.className).toContain("border");
    expect(badge.className).toContain("border-border");
    expect(badge.className).toContain("text-foreground");
  });

  it("renders success variant with design tokens", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge.className).toContain("bg-success-bg");
    expect(badge.className).toContain("text-success-foreground");
  });

  it("renders error variant with design tokens", () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge.className).toContain("bg-error-bg");
    expect(badge.className).toContain("text-error-foreground");
  });

  it("renders warning variant with design tokens", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText("Warning");
    expect(badge.className).toContain("bg-warning-bg");
    expect(badge.className).toContain("text-warning-foreground");
  });

  it("applies common styles: py-1, px-3, text-xs, font-medium", () => {
    render(<Badge>Styled</Badge>);
    const badge = screen.getByText("Styled");
    expect(badge.className).toContain("py-1");
    expect(badge.className).toContain("px-3");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });

  it("merges custom className", () => {
    render(<Badge className="my-class">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("my-class");
    expect(badge.className).toContain("bg-primary");
  });

  it("renders as a span element", () => {
    render(<Badge>Span</Badge>);
    const badge = screen.getByText("Span");
    expect(badge.tagName).toBe("SPAN");
  });
});
