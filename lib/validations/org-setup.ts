import { z } from "zod";

/* ─────────────────────── Enums ────────────────────────────────── */

const NODE_TYPES = ["COMPANY_ROOT", "DIVISION", "DEPARTMENT", "TEAM"] as const;
const PAY_TYPES = ["hourly", "salaried", "contract"] as const;
const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "consultant"] as const;
const EQUIPMENT_CATEGORIES = ["safety", "power-tool", "hand-tool", "machinery", "vehicle", "other"] as const;
const OWNERSHIP_TYPES = ["owned", "rented", "leased"] as const;
const BILLING_TYPES = ["daily-rental", "hourly-rental", "pay-per-use", "owned-internal", "fixed-hire"] as const;
const MATERIAL_CATEGORIES = ["consumable", "raw-material", "component", "chemical"] as const;
const UOM_OPTIONS = ["litre", "kg", "bag", "piece", "m2", "m3", "box", "roll", "set"] as const;
const COST_BASIS_OPTIONS = ["fixed", "market-rate", "contract-rate"] as const;

/* ─────────────────────── Assigned Role ────────────────────────── */

const assignedRoleSchema = z.object({
  roleId: z.string().min(1),
  standardRate: z.number().nullable(),
  overtimeRate: z.number().nullable(),
});

/* ─────────────────────── Node ─────────────────────────────────── */

const createNodeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  type: z.enum(NODE_TYPES),
  parentId: z.string().nullable().default(null),
  nodeHeadPersonId: z.string().nullable().default(null),
  calendarId: z.string().nullable().default(null),
  assignedRoles: z.array(assignedRoleSchema).default([]),
  sortOrder: z.number().int().default(0),
});

const updateNodeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  type: z.enum(NODE_TYPES).optional(),
  parentId: z.string().nullable().optional(),
  nodeHeadPersonId: z.string().nullable().optional(),
  calendarId: z.string().nullable().optional(),
  assignedRoles: z.array(assignedRoleSchema).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/* ─────────────────────── Person ───────────────────────────────── */

const createPersonSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  email: z.string().email("Invalid email"),
  roleId: z.string().nullable().default(null),
  payType: z.enum(PAY_TYPES).default("hourly"),
  standardRate: z.number().nullable().default(null),
  overtimeRate: z.number().nullable().default(null),
  overtimePay: z.boolean().default(false),
  monthlySalary: z.number().nullable().default(null),
  dailyAllocation: z.number().nullable().default(null),
  contractAmount: z.number().nullable().default(null),
  employmentType: z.enum(EMPLOYMENT_TYPES).default("full-time"),
  joinDate: z.string().nullable().default(null),
  photoUrl: z.string().nullable().default(null),
});

const updatePersonSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  employeeId: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  roleId: z.string().nullable().optional(),
  payType: z.enum(PAY_TYPES).optional(),
  standardRate: z.number().nullable().optional(),
  overtimeRate: z.number().nullable().optional(),
  overtimePay: z.boolean().optional(),
  monthlySalary: z.number().nullable().optional(),
  dailyAllocation: z.number().nullable().optional(),
  contractAmount: z.number().nullable().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  joinDate: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

/* ─────────────────────── Equipment ────────────────────────────── */

const createEquipmentSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  category: z.enum(EQUIPMENT_CATEGORIES).default("other"),
  ownershipType: z.enum(OWNERSHIP_TYPES).default("owned"),
  billingType: z.enum(BILLING_TYPES).default("owned-internal"),
  standardRate: z.number().default(0),
  idleRate: z.number().nullable().default(null),
  mobilizationCost: z.number().nullable().default(null),
  rentalStart: z.string().nullable().default(null),
  rentalEnd: z.string().nullable().default(null),
});

const updateEquipmentSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  billingType: z.enum(BILLING_TYPES).optional(),
  standardRate: z.number().optional(),
  idleRate: z.number().nullable().optional(),
  mobilizationCost: z.number().nullable().optional(),
  rentalStart: z.string().nullable().optional(),
  rentalEnd: z.string().nullable().optional(),
});

/* ─────────────────────── Material ─────────────────────────────── */

const createMaterialSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(30),
  category: z.enum(MATERIAL_CATEGORIES).default("consumable"),
  uom: z.enum(UOM_OPTIONS).default("piece"),
  standardCostPerUnit: z.number().default(0),
  costBasis: z.enum(COST_BASIS_OPTIONS).default("fixed"),
  wastageStandardPct: z.number().min(0).max(100).default(0),
  leadTimeDays: z.number().int().nullable().default(null),
  reorderPointQty: z.number().int().nullable().default(null),
});

const updateMaterialSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  sku: z.string().min(1).max(30).optional(),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  uom: z.enum(UOM_OPTIONS).optional(),
  standardCostPerUnit: z.number().optional(),
  costBasis: z.enum(COST_BASIS_OPTIONS).optional(),
  wastageStandardPct: z.number().min(0).max(100).optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  reorderPointQty: z.number().int().nullable().optional(),
});

/* ─────────────────────── Exports ──────────────────────────────── */

export {
  createNodeSchema,
  updateNodeSchema,
  createPersonSchema,
  updatePersonSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
  assignedRoleSchema,
  NODE_TYPES,
  PAY_TYPES,
  EMPLOYMENT_TYPES,
  EQUIPMENT_CATEGORIES,
  OWNERSHIP_TYPES,
  BILLING_TYPES,
  MATERIAL_CATEGORIES,
  UOM_OPTIONS,
  COST_BASIS_OPTIONS,
};
