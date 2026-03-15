import { z } from "zod";

const ENTITY_TYPES = ["eps", "node", "project"] as const;

const EVENT_TYPES = [
  "eps.created",
  "eps.renamed",
  "eps.reordered",
  "eps.deleted",
  "node.created",
  "node.renamed",
  "node.moved",
  "node.deleted",
  "project.created",
  "project.updated",
  "project.moved",
  "project.deleted",
] as const;

const canvasEventInputSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

const canvasSaveSchema = z.object({
  baseVersion: z.number().int().min(0),
  events: z.array(canvasEventInputSchema).min(1).max(100),
});

const canvasHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export {
  canvasEventInputSchema,
  canvasSaveSchema,
  canvasHistoryQuerySchema,
  ENTITY_TYPES,
  EVENT_TYPES,
};
