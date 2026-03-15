import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SplitterHandle } from "./splitter-handle";

describe("SplitterHandle", () => {
  it("renders the splitter", () => {
    render(<SplitterHandle />);
    expect(screen.getByTestId("splitter-handle")).toBeDefined();
    cleanup();
  });

  it("has correct width", () => {
    render(<SplitterHandle />);
    const el = screen.getByTestId("splitter-handle");
    expect(el.style.width).toBe("6px");
    cleanup();
  });
});
