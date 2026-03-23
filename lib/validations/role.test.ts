import { describe, it, expect } from "vitest";
import {
  createRoleSchema,
  updateRoleSchema,
  generateRoleCode,
} from "./role";

describe("generateRoleCode", () => {
  it("generates code from two-word name", () => {
    expect(generateRoleCode("Senior Painter")).toBe("SENI-PA");
  });

  it("generates code from single-word name", () => {
    expect(generateRoleCode("Electrician")).toBe("ELEC-01");
  });

  it("generates code from multi-word name using first two words", () => {
    expect(generateRoleCode("Site Safety Officer")).toBe("SITE-SA");
  });

  it("returns empty string for empty input", () => {
    expect(generateRoleCode("")).toBe("");
    expect(generateRoleCode("   ")).toBe("");
  });

  it("handles short names with padding", () => {
    expect(generateRoleCode("PM")).toBe("PMXX-01");
  });
});

describe("createRoleSchema", () => {
  it("validates a valid role", () => {
    const result = createRoleSchema.safeParse({
      name: "Senior Painter",
      level: "Senior",
      defaultPayType: "hourly",
      overtimeEligible: true,
      skillTags: ["Painting", "Surface prep"],
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = createRoleSchema.safeParse({ name: "Electrician" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level).toBe("Junior");
      expect(result.data.defaultPayType).toBe("hourly");
      expect(result.data.overtimeEligible).toBe(false);
      expect(result.data.skillTags).toEqual([]);
    }
  });

  it("rejects name shorter than 2 chars", () => {
    const result = createRoleSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid level", () => {
    const result = createRoleSchema.safeParse({
      name: "Painter",
      level: "Expert",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid pay type", () => {
    const result = createRoleSchema.safeParse({
      name: "Painter",
      defaultPayType: "volunteer",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("allows partial updates", () => {
    const result = updateRoleSchema.safeParse({ name: "Updated Painter" });
    expect(result.success).toBe(true);
  });

  it("allows empty object (no updates)", () => {
    const result = updateRoleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid level on update", () => {
    const result = updateRoleSchema.safeParse({ level: "Beginner" });
    expect(result.success).toBe(false);
  });
});
