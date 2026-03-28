import { z } from "zod";

/* ─────────────────────── Role Code Generator ─────────────────────── */

/**
 * Generates a role code from a role name.
 * Takes first 4 chars of first word (uppercase) + hyphen + first 2 chars of second word (uppercase).
 * If single word, uses first 4 chars + "-01".
 * Examples: "Senior Painter" → "SNRP-PA", "Electrician" → "ELEC-01"
 */
function generateRoleCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  if (words.length === 1) {
    const word = words[0].toUpperCase().replace(/[^A-Z]/g, "");
    return `${word.slice(0, 4).padEnd(4, "X")}-01`;
  }

  const first = words[0].toUpperCase().replace(/[^A-Z]/g, "");
  const second = words[1].toUpperCase().replace(/[^A-Z]/g, "");

  return `${first.slice(0, 4).padEnd(4, "X")}-${second.slice(0, 2).padEnd(2, "X")}`;
}

/* ─────────────────────── Validation Schemas ──────────────────────── */

const LEVEL_OPTIONS = ["Junior", "Mid", "Senior", "Lead", "Principal"] as const;
const PAY_TYPE_OPTIONS = ["hourly", "salaried", "contract"] as const;
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "CAD", "AUD"] as const;

const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must be at most 100 characters"),
  code: z
    .string()
    .min(2, "Role code must be at least 2 characters")
    .max(20, "Role code must be at most 20 characters")
    .optional(),
  level: z.enum(LEVEL_OPTIONS).default("Junior"),
  defaultPayType: z.enum(PAY_TYPE_OPTIONS).default("hourly"),
  overtimeEligible: z.boolean().default(false),
  skillTags: z.array(z.string().max(50)).max(20).default([]),
  costRateMin: z.number().min(0, "Cost rate min must be >= 0").nullable().optional(),
  costRateMax: z.number().min(0, "Cost rate max must be >= 0").nullable().optional(),
  costRateCurrency: z.string().min(3).max(3).nullable().optional(),
}).refine(
  (data) => {
    if (data.costRateMin != null && data.costRateMax != null) {
      return data.costRateMax >= data.costRateMin;
    }
    return true;
  },
  { message: "Max cost rate must be greater than or equal to min", path: ["costRateMax"] },
);

const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must be at most 100 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Role code must be at least 2 characters")
    .max(20, "Role code must be at most 20 characters")
    .optional(),
  level: z.enum(LEVEL_OPTIONS).optional(),
  defaultPayType: z.enum(PAY_TYPE_OPTIONS).optional(),
  overtimeEligible: z.boolean().optional(),
  skillTags: z.array(z.string().max(50)).max(20).optional(),
  costRateMin: z.number().min(0, "Cost rate min must be >= 0").nullable().optional(),
  costRateMax: z.number().min(0, "Cost rate max must be >= 0").nullable().optional(),
  costRateCurrency: z.string().min(3).max(3).nullable().optional(),
}).refine(
  (data) => {
    if (data.costRateMin != null && data.costRateMax != null) {
      return data.costRateMax >= data.costRateMin;
    }
    return true;
  },
  { message: "Max cost rate must be greater than or equal to min", path: ["costRateMax"] },
);

const searchRolesSchema = z.object({
  q: z.string().max(100).optional(),
});

/* ─────────────────────── Exports ─────────────────────────────────── */

type CreateRoleInput = z.infer<typeof createRoleSchema>;
type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export {
  createRoleSchema,
  updateRoleSchema,
  searchRolesSchema,
  generateRoleCode,
  LEVEL_OPTIONS,
  PAY_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  type CreateRoleInput,
  type UpdateRoleInput,
};
