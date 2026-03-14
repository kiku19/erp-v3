import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BlobBackground } from "./blob-background";

afterEach(cleanup);

describe("BlobBackground", () => {
  it("renders dark variant with blobs", () => {
    render(<BlobBackground variant="dark" />);
    const container = screen.getByTestId("blob-background-dark");
    expect(container).toBeDefined();
    expect(container.querySelectorAll("[data-blob]").length).toBeGreaterThan(0);
  });

  it("renders light variant with blobs", () => {
    render(<BlobBackground variant="light" />);
    const container = screen.getByTestId("blob-background-light");
    expect(container).toBeDefined();
    expect(container.querySelectorAll("[data-blob]").length).toBeGreaterThan(0);
  });

  it("blobs and orbs have animation styles", () => {
    render(<BlobBackground variant="dark" />);
    const container = screen.getByTestId("blob-background-dark");
    const blobs = container.querySelectorAll("[data-blob]");
    expect(blobs.length).toBeGreaterThan(0);
    blobs.forEach((blob) => {
      expect((blob as HTMLElement).style.animation).toBeTruthy();
    });
  });

  it("renders SVG with wave paths and gradient defs", () => {
    render(<BlobBackground variant="light" />);
    const container = screen.getByTestId("blob-background-light");
    const svg = container.querySelector("[data-waves]");
    expect(svg).toBeTruthy();
    expect(svg!.querySelectorAll("path").length).toBe(3);
    expect(svg!.querySelectorAll("linearGradient").length).toBe(3);
  });
});
