import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthBackground } from "./auth-background";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("AuthBackground", () => {
  it("renders with data-testid", () => {
    render(<AuthBackground />);
    expect(screen.getByTestId("auth-background")).toBeDefined();
  });

  it("is hidden from assistive technologies", () => {
    render(<AuthBackground />);
    const bg = screen.getByTestId("auth-background");
    expect(bg.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders SVG elements for blobs and curves", () => {
    render(<AuthBackground />);
    const bg = screen.getByTestId("auth-background");
    const svgs = bg.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("renders gradient definitions for blobs", () => {
    render(<AuthBackground />);
    const bg = screen.getByTestId("auth-background");
    expect(bg.querySelector("#auth-blob-0")).toBeTruthy();
    expect(bg.querySelector("#auth-blob-1")).toBeTruthy();
    expect(bg.querySelector("#auth-blob-2")).toBeTruthy();
  });

  it("renders gradient definitions for curves", () => {
    render(<AuthBackground />);
    const bg = screen.getByTestId("auth-background");
    expect(bg.querySelector("#auth-curve-0")).toBeTruthy();
    expect(bg.querySelector("#auth-curve-1")).toBeTruthy();
  });
});
