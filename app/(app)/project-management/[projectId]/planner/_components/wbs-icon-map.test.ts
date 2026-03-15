import { describe, it, expect } from "vitest";
import { getNextIconColor, WBS_ICON_COLORS, DEFAULT_ICON_COLOR } from "./wbs-icon-map";

describe("getNextIconColor", () => {
  it("returns the next color in the cycle", () => {
    expect(getNextIconColor("text-warning")).toBe("text-info");
    expect(getNextIconColor("text-info")).toBe("text-success");
  });

  it("wraps around to the first color", () => {
    const lastColor = WBS_ICON_COLORS[WBS_ICON_COLORS.length - 1];
    expect(getNextIconColor(lastColor)).toBe(WBS_ICON_COLORS[0]);
  });

  it("returns first color for unknown value", () => {
    expect(getNextIconColor("text-unknown")).toBe(WBS_ICON_COLORS[0]);
  });

  it("has text-warning as the default icon color", () => {
    expect(DEFAULT_ICON_COLOR).toBe("text-warning");
  });
});
