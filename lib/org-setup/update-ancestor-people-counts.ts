import type { PrismaClient } from "@/app/generated/prisma/client";

type TxClient = Omit<PrismaClient, "$transaction" | "$connect" | "$disconnect" | "$on" | "$extends">;

/**
 * Walk from `nodeId` up through parentId ancestors, incrementing
 * each node's `totalPeopleCount` by `delta`.
 *
 * Should be called inside a Prisma transaction for atomicity.
 * Accepts null nodeId (no-op) for convenience at call sites.
 */
async function updateAncestorPeopleCounts(
  nodeId: string | null,
  delta: number,
  tenantId: string,
  tx: TxClient,
): Promise<void> {
  if (!nodeId || delta === 0) return;

  let currentId: string | null = nodeId;

  while (currentId) {
    const node: { id: string; parentId: string | null } | null = await tx.oBSNode.findFirst({
      where: { id: currentId, tenantId, isDeleted: false },
      select: { id: true, parentId: true },
    });

    if (!node) break;

    await tx.oBSNode.update({
      where: { id: node.id },
      data: { totalPeopleCount: { increment: delta } },
    });

    currentId = node.parentId;
  }
}

export { updateAncestorPeopleCounts };
