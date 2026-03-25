import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateNodeSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

type RouteContext = { params: Promise<{ id: string }> };

async function collectDescendantIds(
  tenantId: string,
  nodeId: string,
): Promise<string[]> {
  const children = await prisma.oBSNode.findMany({
    where: { tenantId, parentId: nodeId, isDeleted: false },
    select: { id: true },
  });
  const descendantIds: string[] = [];
  for (const child of children) {
    descendantIds.push(child.id);
    const grandchildren = await collectDescendantIds(tenantId, child.id);
    descendantIds.push(...grandchildren);
  }
  return descendantIds;
}

/**
 * @swagger
 * /api/org-setup/nodes/{id}:
 *   patch:
 *     summary: Update an existing OBS node
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               code:
 *                 type: string
 *                 maxLength: 20
 *               type:
 *                 type: string
 *                 enum: [COMPANY_ROOT, DIVISION, DEPARTMENT, TEAM]
 *               parentId:
 *                 type: string
 *                 nullable: true
 *               nodeHeadPersonId:
 *                 type: string
 *                 nullable: true
 *               calendarId:
 *                 type: string
 *                 nullable: true
 *               assignedRoles:
 *                 type: array
 *                 items:
 *                   type: object
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Node updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 node:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.oBSNode.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 404 },
      );
    }

    const node = await prisma.oBSNode.update({
      where: { id },
      data: parsed.data,
    });

    emitOBSEvent(OBS_EVENTS.NODE_UPDATED, tenantId, node.id, {
      node,
      changes: parsed.data,
    });

    return NextResponse.json({ node });
  } catch (error) {
    console.error("PATCH /api/org-setup/nodes/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/nodes/{id}:
 *   delete:
 *     summary: Soft-delete an OBS node with cascade to descendants and resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;

    const existing = await prisma.oBSNode.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 404 },
      );
    }

    const allIds = [id, ...(await collectDescendantIds(tenantId, id))];

    await prisma.$transaction([
      prisma.oBSNode.updateMany({
        where: { id: { in: allIds }, tenantId },
        data: { isDeleted: true },
      }),
      prisma.oBSPerson.updateMany({
        where: { nodeId: { in: allIds }, tenantId },
        data: { isDeleted: true },
      }),
      prisma.oBSEquipment.updateMany({
        where: { nodeId: { in: allIds }, tenantId },
        data: { isDeleted: true },
      }),
      prisma.oBSMaterial.updateMany({
        where: { nodeId: { in: allIds }, tenantId },
        data: { isDeleted: true },
      }),
    ]);

    emitOBSEvent(OBS_EVENTS.NODE_DELETED, tenantId, id, {
      nodeId: id,
      cascadedIds: allIds,
    });

    return NextResponse.json({ message: "Node deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/org-setup/nodes/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
