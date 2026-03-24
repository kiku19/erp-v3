import { z } from "zod";

const createEpsSchema = z.object({
  name: z.string().trim().min(1, "EPS name is required").max(255),
});

const updateEpsSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const createNodeSchema = z.object({
  name: z.string().trim().min(1, "Node name is required").max(255),
  parentNodeId: z.string().optional(),
});

const updateNodeSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  epsId: z.string().optional(),
  parentNodeId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const reorderEpsSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(255),
  nodeId: z.string().optional(),
  responsibleManager: z.string().trim().max(255).optional(),
  startDate: z.string().datetime().optional(),
  finishDate: z.string().datetime().optional(),
});

const PROJECT_STATUSES = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
] as const;

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  epsId: z.string().optional(),
  nodeId: z.string().nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  responsibleManager: z.string().trim().max(255).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  finishDate: z.string().datetime().nullable().optional(),
  percentDone: z.number().min(0).max(100).optional(),
  budget: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  eac: z.number().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export {
  createEpsSchema,
  updateEpsSchema,
  createNodeSchema,
  updateNodeSchema,
  reorderEpsSchema,
  createProjectSchema,
  updateProjectSchema,
  PROJECT_STATUSES,
};
