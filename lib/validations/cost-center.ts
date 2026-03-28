import { z } from "zod";

/* ─────────────────────── Cost Center Code Generator ─────────────── */

/**
 * Generates a cost center code from a name.
 * Takes first 4 chars of first word (uppercase) + hyphen + first 2 chars of second word (uppercase).
 * If single word, uses first 4 chars + "-01".
 * Examples: "Admin Office" → "ADMN-OF", "Operations" → "OPER-01"
 */
function generateCostCenterCode(name: string): string {
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

const createCostCenterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .default(""),
});

const updateCostCenterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

const searchCostCentersSchema = z.object({
  q: z.string().max(100).optional(),
});

/* ─────────────────────── Exports ─────────────────────────────────── */

type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;

export {
  createCostCenterSchema,
  updateCostCenterSchema,
  searchCostCentersSchema,
  generateCostCenterCode,
  type CreateCostCenterInput,
  type UpdateCostCenterInput,
};
