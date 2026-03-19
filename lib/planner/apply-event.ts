import type { PrismaClient } from "@/app/generated/prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

interface PlannerEventInput {
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}

/**
 * Applies a single planner event to the relational Prisma models.
 * Called inside a transaction after the event is written to PlannerEvent.
 */
async function applyPlannerEvent(
  tx: Tx,
  tenantId: string,
  event: PlannerEventInput,
): Promise<void> {
  const { eventType, entityId, payload } = event;

  switch (eventType) {
    /* ── WBS ── */
    case "wbs.created":
      await tx.wbsNode.create({
        data: {
          id: entityId,
          tenantId,
          projectId: payload.projectId as string,
          parentId: (payload.parentId as string) ?? null,
          wbsCode: payload.wbsCode as string,
          name: payload.name as string,
          sortOrder: (payload.sortOrder as number) ?? 0,
        },
      });
      break;

    case "wbs.updated":
      await tx.wbsNode.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, ["name", "wbsCode", "sortOrder"]),
      });
      break;

    case "wbs.deleted":
      await tx.wbsNode.update({
        where: { id: entityId },
        data: { isDeleted: true },
      });
      break;

    case "wbs.moved":
      await tx.wbsNode.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, ["parentId", "sortOrder"]),
      });
      break;

    /* ── Activity ── */
    case "activity.created":
      await tx.activity.create({
        data: {
          id: entityId,
          tenantId,
          projectId: payload.projectId as string,
          wbsNodeId: payload.wbsNodeId as string,
          activityId: payload.activityId as string,
          name: payload.name as string,
          activityType: (payload.activityType as string) ?? "task",
          duration: (payload.duration as number) ?? 0,
          durationUnit: (payload.durationUnit as string) ?? "days",
          totalQuantity: (payload.totalQuantity as number) ?? 0,
          totalWorkHours: (payload.totalWorkHours as number) ?? 0,
          sortOrder: (payload.sortOrder as number) ?? 0,
        },
      });
      break;

    case "activity.updated":
      await tx.activity.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, [
          "name",
          "activityType",
          "duration",
          "durationUnit",
          "totalQuantity",
          "totalWorkHours",
          "percentComplete",
          "calendarId",
          "startDate",
          "finishDate",
          "sortOrder",
        ]),
      });
      break;

    case "activity.deleted":
      await tx.activity.update({
        where: { id: entityId },
        data: { isDeleted: true },
      });
      break;

    case "activity.moved":
      await tx.activity.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, ["wbsNodeId", "sortOrder"]),
      });
      break;

    /* ── Relationship ── */
    case "relationship.created":
      await tx.activityRelationship.create({
        data: {
          id: entityId,
          tenantId,
          projectId: payload.projectId as string,
          predecessorId: payload.predecessorId as string,
          successorId: payload.successorId as string,
          relationshipType: (payload.relationshipType as string) ?? "FS",
          lag: (payload.lag as number) ?? 0,
        },
      });
      break;

    case "relationship.deleted":
      await tx.activityRelationship.update({
        where: { id: entityId },
        data: { isDeleted: true },
      });
      break;

    /* ── Resource ── */
    case "resource.created":
      await tx.resource.create({
        data: {
          id: entityId,
          tenantId,
          projectId: payload.projectId as string,
          name: payload.name as string,
          resourceType: (payload.resourceType as string) ?? "labor",
          maxUnitsPerDay: (payload.maxUnitsPerDay as number) ?? 8,
          costPerUnit: (payload.costPerUnit as number) ?? 0,
          sortOrder: (payload.sortOrder as number) ?? 0,
        },
      });
      break;

    case "resource.updated":
      await tx.resource.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, [
          "name", "resourceType", "maxUnitsPerDay", "costPerUnit", "sortOrder",
        ]),
      });
      break;

    case "resource.deleted":
      await tx.resource.update({
        where: { id: entityId },
        data: { isDeleted: true },
      });
      break;

    /* ── Resource Assignment ── */
    case "resourceAssignment.created":
      await tx.resourceAssignment.create({
        data: {
          id: entityId,
          tenantId,
          projectId: payload.projectId as string,
          activityId: payload.activityId as string,
          resourceId: payload.resourceId as string,
          unitsPerDay: (payload.unitsPerDay as number) ?? 1,
          budgetedCost: (payload.budgetedCost as number) ?? 0,
          actualCost: (payload.actualCost as number) ?? 0,
        },
      });
      break;

    case "resourceAssignment.updated":
      await tx.resourceAssignment.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, [
          "unitsPerDay", "budgetedCost", "actualCost",
        ]),
      });
      break;

    case "resourceAssignment.deleted":
      await tx.resourceAssignment.update({
        where: { id: entityId },
        data: { isDeleted: true },
      });
      break;

    /* ── Project ── */
    case "project.updated":
      await tx.project.update({
        where: { id: entityId },
        data: extractUpdateFields(payload, ["startDate", "finishDate"]),
      });
      break;

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

/** Extract only the keys present in payload that are in the allowed list. */
function extractUpdateFields(
  payload: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in payload) {
      data[key] = payload[key];
    }
  }
  return data;
}

export { applyPlannerEvent, type PlannerEventInput };
