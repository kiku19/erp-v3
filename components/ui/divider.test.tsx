import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Divider } from "./divider";

afterEach(cleanup);

describe("Divider", () => {
  it("renders as a horizontal line by default", () => {
    render(<Divider data-testid="divider" />);
    const divider = screen.getByTestId("divider");
    expect(divider.className).toContain("w-full");
    expect(divider.className).toContain("h-px");
    expect(divider.className).toContain("bg-border");
  });

  it("renders horizontal orientation explicitly", () => {
    render(<Divider orientation="horizontal" data-testid="divider" />);
    const divider = screen.getByTestId("divider");
    expect(divider.className).toContain("w-full");
    expect(divider.className).toContain("h-px");
  });

  it("renders vertical orientation", () => {
    render(<Divider orientation="vertical" data-testid="divider" />);
    const divider = screen.getByTestId("divider");
    expect(divider.className).toContain("w-px");
    expect(divider.className).toContain("h-full");
    expect(divider.className).toContain("bg-border");
  });

  it("uses separator role", () => {
    render(<Divider data-testid="divider" />);
    const divider = screen.getByRole("separator");
    expect(divider).toBeDefined();
  });

  it("sets aria-orientation for vertical", () => {
    render(<Divider orientation="vertical" data-testid="divider" />);
    const divider = screen.getByRole("separator");
    expect(divider.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("merges custom className", () => {
    render(<Divider data-testid="divider" className="my-divider" />);
    const divider = screen.getByTestId("divider");
    expect(divider.className).toContain("my-divider");
    expect(divider.className).toContain("bg-border");
  });

  it("renders as a div element", () => {
    render(<Divider data-testid="divider" />);
    const divider = screen.getByTestId("divider");
    expect(divider.tagName).toBe("DIV");
  });
});
