import type { PrismaClient } from "@/app/generated/prisma/client";

interface EventInput {
  eventType: string;
  entityType: "eps" | "node" | "project";
  entityId: string;
  payload: Record<string, unknown>;
}

interface ApplyResult {
  /** Maps temp client IDs to server-assigned IDs for create events */
  idMap: Record<string, string>;
}

/**
 * Applies a batch of canvas events to the normalized tables within a transaction.
 * Returns a map of temp client IDs → server-assigned IDs for create events.
 */
async function applyEvents(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  tenantId: string,
  events: EventInput[],
): Promise<ApplyResult> {
  const idMap: Record<string, string> = {};

  for (const event of events) {
    const { eventType, entityId, payload } = event;
    // For create events, entityId is the temp client ID
    // For other events, resolve through idMap in case it was created in same batch
    const resolvedId = idMap[entityId] ?? entityId;

    switch (eventType) {
      case "eps.created": {
        const maxSort = await tx.eps.aggregate({
          where: { tenantId, isDeleted: false },
          _max: { sortOrder: true },
        });
        const created = await tx.eps.create({
          data: {
            tenantId,
            name: payload.name as string,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          },
        });
        idMap[entityId] = created.id;
        break;
      }

      case "eps.renamed": {
        await tx.eps.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data: { name: payload.name as string },
        });
        break;
      }

      case "eps.reordered": {
        await tx.eps.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data: { sortOrder: payload.sortOrder as number },
        });
        break;
      }

      case "eps.deleted": {
        // Cascade soft-delete: projects → nodes → eps
        await tx.project.updateMany({
          where: { epsId: resolvedId, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        await tx.node.updateMany({
          where: { epsId: resolvedId, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        await tx.eps.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        break;
      }

      case "node.created": {
        const parentKey = payload.parentNodeId
          ? { parentNodeId: payload.parentNodeId as string }
          : { epsId: payload.epsId as string, parentNodeId: null };
        const maxSort = await tx.node.aggregate({
          where: { tenantId, isDeleted: false, ...parentKey },
          _max: { sortOrder: true },
        });
        const resolvedEpsId = idMap[payload.epsId as string] ?? (payload.epsId as string);
        const resolvedParentNodeId = payload.parentNodeId
          ? idMap[payload.parentNodeId as string] ?? (payload.parentNodeId as string)
          : null;
        const created = await tx.node.create({
          data: {
            tenantId,
            epsId: resolvedEpsId,
            parentNodeId: resolvedParentNodeId,
            name: payload.name as string,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          },
        });
        idMap[entityId] = created.id;
        break;
      }

      case "node.renamed": {
        await tx.node.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data: { name: payload.name as string },
        });
        break;
      }

      case "node.moved": {
        const data: Record<string, unknown> = {};
        if (payload.epsId !== undefined) data.epsId = idMap[payload.epsId as string] ?? payload.epsId;
        if (payload.parentNodeId !== undefined) {
          data.parentNodeId = payload.parentNodeId
            ? idMap[payload.parentNodeId as string] ?? payload.parentNodeId
            : null;
        }
        if (payload.sortOrder !== undefined) data.sortOrder = payload.sortOrder;
        await tx.node.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data,
        });
        break;
      }

      case "node.deleted": {
        // Recursive cascade: find descendants, soft-delete all
        const descendantIds = await getDescendantNodeIds(tx, resolvedId, tenantId);
        const allNodeIds = [resolvedId, ...descendantIds];
        await tx.project.updateMany({
          where: { nodeId: { in: allNodeIds }, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        await tx.node.updateMany({
          where: { id: { in: allNodeIds }, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        break;
      }

      case "project.created": {
        // Generate project ID
        const year = new Date().getFullYear();
        const lastProject = await tx.project.findFirst({
          where: { tenantId, projectId: { startsWith: `PRJ-${year}-` } },
          orderBy: { projectId: "desc" },
        });
        const seq = lastProject
          ? parseInt(lastProject.projectId.split("-")[2], 10) + 1
          : 1;
        const projectId = `PRJ-${year}-${String(seq).padStart(4, "0")}`;

        const resolvedEpsId = idMap[payload.epsId as string] ?? (payload.epsId as string);
        const resolvedNodeId = payload.nodeId
          ? idMap[payload.nodeId as string] ?? (payload.nodeId as string)
          : null;

        const created = await tx.project.create({
          data: {
            tenantId,
            epsId: resolvedEpsId,
            nodeId: resolvedNodeId,
            projectId,
            name: payload.name as string,
            status: (payload.status as string) ?? "Planning",
            responsibleManager: (payload.responsibleManager as string) ?? null,
            startDate: payload.startDate ? new Date(payload.startDate as string) : null,
            finishDate: payload.finishDate ? new Date(payload.finishDate as string) : null,
          },
        });
        idMap[entityId] = created.id;
        break;
      }

      case "project.updated": {
        const data: Record<string, unknown> = {};
        const allowedFields = [
          "name", "status", "responsibleManager", "percentDone",
          "budget", "actualCost", "eac", "sortOrder",
        ];
        for (const field of allowedFields) {
          if (payload[field] !== undefined) data[field] = payload[field];
        }
        if (payload.startDate !== undefined) {
          data.startDate = payload.startDate ? new Date(payload.startDate as string) : null;
        }
        if (payload.finishDate !== undefined) {
          data.finishDate = payload.finishDate ? new Date(payload.finishDate as string) : null;
        }
        if (Object.keys(data).length > 0) {
          await tx.project.updateMany({
            where: { id: resolvedId, tenantId, isDeleted: false },
            data,
          });
        }
        break;
      }

      case "project.moved": {
        const data: Record<string, unknown> = {};
        if (payload.epsId !== undefined) data.epsId = idMap[payload.epsId as string] ?? payload.epsId;
        if (payload.nodeId !== undefined) {
          data.nodeId = payload.nodeId
            ? idMap[payload.nodeId as string] ?? payload.nodeId
            : null;
        }
        if (payload.sortOrder !== undefined) data.sortOrder = payload.sortOrder;
        await tx.project.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data,
        });
        break;
      }

      case "project.deleted": {
        await tx.project.updateMany({
          where: { id: resolvedId, tenantId, isDeleted: false },
          data: { isDeleted: true },
        });
        break;
      }
    }
  }

  return { idMap };
}

async function getDescendantNodeIds(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  nodeId: string,
  tenantId: string,
): Promise<string[]> {
  const children = await tx.node.findMany({
    where: { parentNodeId: nodeId, tenantId, isDeleted: false },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const nested = await getDescendantNodeIds(tx, child.id, tenantId);
    ids.push(...nested);
  }
  return ids;
}

export { applyEvents, type EventInput, type ApplyResult };
