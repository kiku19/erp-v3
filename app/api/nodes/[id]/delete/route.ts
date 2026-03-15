import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/nodes/{id}/delete:
 *   patch:
 *     summary: Soft delete a node and cascade to child nodes and projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node soft deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const existing = await prisma.node.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 404 },
      );
    }

    // Find all descendant node IDs recursively
    const tenantId = auth.tenantId;
    async function getDescendantNodeIds(parentId: string): Promise<string[]> {
      const children = await prisma.node.findMany({
        where: {
          parentNodeId: parentId,
          tenantId,
          isDeleted: false,
        },
        select: { id: true },
      });

      const ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        const grandchildren = await getDescendantNodeIds(child.id);
        ids.push(...grandchildren);
      }
      return ids;
    }

    const descendantIds = await getDescendantNodeIds(id);
    const allNodeIds = [id, ...descendantIds];

    // Cascade soft delete: node + descendants + their projects
    await prisma.$transaction([
      prisma.project.updateMany({
        where: {
          nodeId: { in: allNodeIds },
          tenantId: auth.tenantId,
          isDeleted: false,
        },
        data: { isDeleted: true },
      }),
      prisma.node.updateMany({
        where: {
          id: { in: allNodeIds },
          tenantId: auth.tenantId,
          isDeleted: false,
        },
        data: { isDeleted: true },
      }),
    ]);

    return NextResponse.json({ message: "Node deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete node" },
      { status: 500 },
    );
  }
}
