import { describe, it, expect } from "vitest";
import { toDays, fromDays, type DurationUnit } from "./duration-utils";

describe("toDays", () => {
  it("converts hours to days (÷8)", () => {
    expect(toDays(8, "hours")).toBe(1);
    expect(toDays(16, "hours")).toBe(2);
    expect(toDays(4, "hours")).toBe(0.5);
  });

  it("returns identity for days", () => {
    expect(toDays(5, "days")).toBe(5);
    expect(toDays(0, "days")).toBe(0);
    expect(toDays(1, "days")).toBe(1);
  });

  it("converts weeks to days (×5 working days)", () => {
    expect(toDays(1, "weeks")).toBe(5);
    expect(toDays(2, "weeks")).toBe(10);
    expect(toDays(0.5, "weeks")).toBe(2.5);
  });

  it("converts months to days (×22 working days)", () => {
    expect(toDays(1, "months")).toBe(22);
    expect(toDays(2, "months")).toBe(44);
    expect(toDays(0.5, "months")).toBe(11);
  });

  it("handles zero for all units", () => {
    const units: DurationUnit[] = ["hours", "days", "weeks", "months"];
    for (const unit of units) {
      expect(toDays(0, unit)).toBe(0);
    }
  });

  it("handles fractional values", () => {
    expect(toDays(12, "hours")).toBe(1.5);
    expect(toDays(3.5, "days")).toBe(3.5);
  });
});

describe("fromDays", () => {
  it("converts days to hours (×8)", () => {
    expect(fromDays(1, "hours")).toBe(8);
    expect(fromDays(2, "hours")).toBe(16);
    expect(fromDays(0.5, "hours")).toBe(4);
  });

  it("returns identity for days", () => {
    expect(fromDays(5, "days")).toBe(5);
    expect(fromDays(0, "days")).toBe(0);
  });

  it("converts days to weeks (÷5)", () => {
    expect(fromDays(5, "weeks")).toBe(1);
    expect(fromDays(10, "weeks")).toBe(2);
  });

  it("converts days to months (÷22)", () => {
    expect(fromDays(22, "months")).toBe(1);
    expect(fromDays(44, "months")).toBe(2);
  });

  it("roundtrips toDays → fromDays", () => {
    const units: DurationUnit[] = ["hours", "days", "weeks", "months"];
    for (const unit of units) {
      expect(fromDays(toDays(10, unit), unit)).toBeCloseTo(10);
    }
  });
});
