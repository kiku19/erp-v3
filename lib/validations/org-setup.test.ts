// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createNodeSchema,
  updateNodeSchema,
  createPersonSchema,
  updatePersonSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
} from "./org-setup";

describe("createNodeSchema", () => {
  it("accepts valid node input", () => {
    const result = createNodeSchema.safeParse({
      name: "Engineering",
      code: "ENG-01",
      type: "DIVISION",
      parentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createNodeSchema.safeParse({
      name: "",
      code: "ENG-01",
      type: "DIVISION",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createNodeSchema.safeParse({
      name: "Engineering",
      code: "ENG-01",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPersonSchema", () => {
  it("accepts valid person input", () => {
    const result = createPersonSchema.safeParse({
      nodeId: "node-1",
      name: "John Doe",
      employeeId: "EMP-001",
      email: "john@example.com",
      payType: "hourly",
      employmentType: "full-time",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createPersonSchema.safeParse({
      nodeId: "node-1",
      name: "John Doe",
      employeeId: "EMP-001",
      email: "not-an-email",
      payType: "hourly",
      employmentType: "full-time",
    });
    expect(result.success).toBe(false);
  });
});

describe("createEquipmentSchema", () => {
  it("accepts valid equipment input", () => {
    const result = createEquipmentSchema.safeParse({
      nodeId: "node-1",
      name: "Excavator",
      code: "EXC-01",
      category: "machinery",
      ownershipType: "owned",
      billingType: "owned-internal",
      standardRate: 150,
    });
    expect(result.success).toBe(true);
  });
});

describe("createMaterialSchema", () => {
  it("accepts valid material input", () => {
    const result = createMaterialSchema.safeParse({
      nodeId: "node-1",
      name: "Cement",
      sku: "CEM-50KG",
      category: "raw-material",
      uom: "bag",
      standardCostPerUnit: 350,
      costBasis: "fixed",
      wastageStandardPct: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("update schemas are partial", () => {
  it("updateNodeSchema accepts partial input", () => {
    const result = updateNodeSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("updatePersonSchema accepts partial input", () => {
    const result = updatePersonSchema.safeParse({ standardRate: 50 });
    expect(result.success).toBe(true);
  });

  it("updateEquipmentSchema accepts partial input", () => {
    const result = updateEquipmentSchema.safeParse({ standardRate: 200 });
    expect(result.success).toBe(true);
  });

  it("updateMaterialSchema accepts partial input", () => {
    const result = updateMaterialSchema.safeParse({ standardCostPerUnit: 400 });
    expect(result.success).toBe(true);
  });
});
