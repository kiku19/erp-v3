import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SplitterHandle } from "./splitter-handle";

describe("SplitterHandle", () => {
  it("renders the splitter", () => {
    render(<SplitterHandle onResize={vi.fn()} />);
    expect(screen.getByTestId("splitter-handle")).toBeDefined();
    cleanup();
  });

  it("has correct width", () => {
    render(<SplitterHandle onResize={vi.fn()} />);
    const el = screen.getByTestId("splitter-handle");
    expect(el.style.width).toBe("6px");
    cleanup();
  });

  it("uses custom testId", () => {
    render(<SplitterHandle onResize={vi.fn()} testId="custom-splitter" />);
    expect(screen.getByTestId("custom-splitter")).toBeDefined();
    cleanup();
  });
});
