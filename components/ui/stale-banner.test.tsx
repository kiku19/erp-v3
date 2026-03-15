import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutosaveIndicator } from "./stale-banner";

describe("AutosaveIndicator", () => {
  it("shows cloud icon with saved message when idle and no lastSavedAt", () => {
    render(<AutosaveIndicator status="idle" />);
    expect(screen.getByText("All changes saved")).toBeDefined();
  });

  it("shows relative time when idle with lastSavedAt", () => {
    const recentDate = new Date(Date.now() - 2000);
    render(<AutosaveIndicator status="idle" lastSavedAt={recentDate} />);
    const indicators = screen.getAllByTestId("autosave-indicator");
    const hasMatch = indicators.some((el) => el.textContent?.match(/Saved/));
    expect(hasMatch).toBe(true);
  });

  it("shows spinner when saving", () => {
    render(<AutosaveIndicator status="saving" />);
    expect(screen.getByText("Saving...")).toBeDefined();
  });

  it("shows check when saved", () => {
    render(<AutosaveIndicator status="saved" />);
    const indicators = screen.getAllByTestId("autosave-indicator");
    const hasMatch = indicators.some((el) => el.textContent?.match(/Saved/));
    expect(hasMatch).toBe(true);
  });

  it("shows error when save failed", () => {
    render(<AutosaveIndicator status="error" />);
    expect(screen.getByText(/Save failed/)).toBeDefined();
  });

  it("shows offline with pending count", () => {
    render(<AutosaveIndicator status="offline" pendingCount={3} />);
    expect(screen.getByText(/Offline · 3 changes queued/)).toBeDefined();
  });

  it("shows offline without pending count", () => {
    render(<AutosaveIndicator status="offline" pendingCount={0} />);
    expect(screen.getByText("Offline")).toBeDefined();
  });

  it("shows stale status with reload hint", () => {
    render(<AutosaveIndicator status="stale" onReload={() => {}} />);
    expect(screen.getByText("Updated externally")).toBeDefined();
    expect(screen.getByText(/click to reload/)).toBeDefined();
  });

  it("calls onReload when stale indicator is clicked", () => {
    const onReload = vi.fn();
    render(<AutosaveIndicator status="stale" onReload={onReload} />);
    const indicators = screen.getAllByTestId("autosave-indicator");
    fireEvent.click(indicators[indicators.length - 1]);
    expect(onReload).toHaveBeenCalledOnce();
  });
});
