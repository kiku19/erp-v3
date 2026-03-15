import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWbsIconSettings, STORAGE_KEY, DEFAULT_ICON_ORDER } from "./use-wbs-icon-settings";

describe("useWbsIconSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default icon order when nothing in localStorage", () => {
    const { result } = renderHook(() => useWbsIconSettings());
    expect(result.current.settings.icons).toEqual(DEFAULT_ICON_ORDER);
  });

  it("loads saved settings from localStorage", () => {
    const custom = { icons: ["Star", "Circle"] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

    const { result } = renderHook(() => useWbsIconSettings());
    expect(result.current.settings.icons).toEqual(["Star", "Circle"]);
  });

  it("updates settings and persists to localStorage", () => {
    const { result } = renderHook(() => useWbsIconSettings());

    act(() => result.current.updateSettings(["Box", "Hexagon", "Flag"]));

    expect(result.current.settings.icons).toEqual(["Box", "Hexagon", "Flag"]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.icons).toEqual(["Box", "Hexagon", "Flag"]);
  });

  it("getNextIcon cycles through icons", () => {
    const { result } = renderHook(() => useWbsIconSettings());
    // Default order: ["Folder", "FolderOpen", "Star", "Circle", "Square"]

    expect(result.current.getNextIcon("Folder")).toBe("FolderOpen");
    expect(result.current.getNextIcon("Square")).toBe("Folder"); // wraps
  });

  it("getNextIcon returns first icon for unknown icon", () => {
    const { result } = renderHook(() => useWbsIconSettings());
    expect(result.current.getNextIcon("UnknownIcon")).toBe("Folder");
  });

  it("falls back to defaults for corrupt localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json");
    const { result } = renderHook(() => useWbsIconSettings());
    expect(result.current.settings.icons).toEqual(DEFAULT_ICON_ORDER);
  });

  it("falls back to defaults for empty icons array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ icons: [] }));
    const { result } = renderHook(() => useWbsIconSettings());
    expect(result.current.settings.icons).toEqual(DEFAULT_ICON_ORDER);
  });
});
