import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ObsModal } from "./obs-modal";

describe("ObsModal", () => {
  afterEach(() => cleanup());

  it("renders modal with title when open", () => {
    render(<ObsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("OBS — Organizational Breakdown Structure")).toBeDefined();
  });

  it("renders nothing when closed", () => {
    render(<ObsModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("OBS — Organizational Breakdown Structure")).toBeNull();
  });

  it("renders organization tree header", () => {
    render(<ObsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Organization Tree")).toBeDefined();
  });

  it("renders tree nodes", () => {
    render(<ObsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Rajesh Kumar")).toBeDefined();
  });

  it("renders person details panel", () => {
    render(<ObsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Contact & Role")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<ObsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("obs-close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
