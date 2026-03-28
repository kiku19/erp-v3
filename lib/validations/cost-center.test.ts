import { describe, it, expect } from "vitest";
import {
  createCostCenterSchema,
  updateCostCenterSchema,
  generateCostCenterCode,
} from "./cost-center";

describe("generateCostCenterCode", () => {
  it("generates code from two-word name", () => {
    expect(generateCostCenterCode("Admin Office")).toBe("ADMI-OF");
  });

  it("generates code from single-word name", () => {
    expect(generateCostCenterCode("Operations")).toBe("OPER-01");
  });

  it("returns empty string for empty input", () => {
    expect(generateCostCenterCode("")).toBe("");
  });

  it("handles whitespace-only input", () => {
    expect(generateCostCenterCode("   ")).toBe("");
  });

  it("pads short words", () => {
    expect(generateCostCenterCode("IT")).toBe("ITXX-01");
  });
});

describe("createCostCenterSchema", () => {
  it("validates valid input", () => {
    const result = createCostCenterSchema.safeParse({
      name: "Admin Office",
      code: "ADMN-OF",
    });
    expect(result.success).toBe(true);
  });

  it("allows description", () => {
    const result = createCostCenterSchema.safeParse({
      name: "Admin Office",
      code: "ADMN-OF",
      description: "Central admin costs",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Central admin costs");
    }
  });

  it("rejects missing name", () => {
    const result = createCostCenterSchema.safeParse({ code: "TEST" });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = createCostCenterSchema.safeParse({ name: "A", code: "T" });
    expect(result.success).toBe(false);
  });

  it("code is optional (auto-generated)", () => {
    const result = createCostCenterSchema.safeParse({ name: "Admin Office" });
    expect(result.success).toBe(true);
  });
});

describe("updateCostCenterSchema", () => {
  it("allows partial update", () => {
    const result = updateCostCenterSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("allows empty object", () => {
    const result = updateCostCenterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates description length", () => {
    const result = updateCostCenterSchema.safeParse({
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
