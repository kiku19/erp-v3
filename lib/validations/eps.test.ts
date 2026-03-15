import { describe, it, expect } from "vitest";
import {
  createEpsSchema,
  updateEpsSchema,
  createNodeSchema,
  createProjectSchema,
  updateProjectSchema,
} from "./eps";

describe("createEpsSchema", () => {
  it("accepts valid EPS name", () => {
    const result = createEpsSchema.safeParse({ name: "Energy Division" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createEpsSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 255 characters", () => {
    const result = createEpsSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = createEpsSchema.safeParse({ name: "  Energy Division  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Energy Division");
    }
  });
});

describe("updateEpsSchema", () => {
  it("accepts partial update with name only", () => {
    const result = updateEpsSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateEpsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("createNodeSchema", () => {
  it("accepts valid node name without parentNodeId", () => {
    const result = createNodeSchema.safeParse({ name: "Oil & Gas" });
    expect(result.success).toBe(true);
  });

  it("accepts valid node name with parentNodeId", () => {
    const result = createNodeSchema.safeParse({
      name: "Offshore",
      parentNodeId: "cuid123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createNodeSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts valid project with required fields only", () => {
    const result = createProjectSchema.safeParse({ name: "Horizon LNG" });
    expect(result.success).toBe(true);
  });

  it("accepts valid project with all fields", () => {
    const result = createProjectSchema.safeParse({
      name: "Horizon LNG",
      nodeId: "cuid456",
      responsibleManager: "Sarah Chen",
      startDate: "2024-01-15T00:00:00.000Z",
      finishDate: "2026-03-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = createProjectSchema.safeParse({
      name: "Test",
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  it("accepts partial update", () => {
    const result = updateProjectSchema.safeParse({
      status: "Active",
      percentDone: 42.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateProjectSchema.safeParse({
      status: "InvalidStatus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects percentDone out of range", () => {
    const result = updateProjectSchema.safeParse({
      percentDone: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts budget and financial fields", () => {
    const result = updateProjectSchema.safeParse({
      budget: 2800000000,
      actualCost: 1900000000,
      eac: 3100000000,
    });
    expect(result.success).toBe(true);
  });
});
