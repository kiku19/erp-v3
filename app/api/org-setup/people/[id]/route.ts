import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updatePersonSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";
import { updateAncestorPeopleCounts } from "@/lib/org-setup/update-ancestor-people-counts";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/org-setup/people/{id}:
 *   patch:
 *     summary: Update an existing OBS person
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
 *               nodeId:
 *                 type: string
 *                 nullable: true
 *               name:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               roleId:
 *                 type: string
 *                 nullable: true
 *               payType:
 *                 type: string
 *                 enum: [hourly, salaried, contract]
 *               standardRate:
 *                 type: number
 *                 nullable: true
 *               overtimeRate:
 *                 type: number
 *                 nullable: true
 *               overtimePay:
 *                 type: boolean
 *               monthlySalary:
 *                 type: number
 *                 nullable: true
 *               dailyAllocation:
 *                 type: number
 *                 nullable: true
 *               contractAmount:
 *                 type: number
 *                 nullable: true
 *               employmentType:
 *                 type: string
 *                 enum: [full-time, part-time, contract, consultant]
 *               joinDate:
 *                 type: string
 *                 nullable: true
 *               photoUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Person updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 person:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Person not found
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
    const parsed = updatePersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.oBSPerson.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Person not found" },
        { status: 404 },
      );
    }

    // Validate target node exists when changing nodeId to a non-null value
    if (parsed.data.nodeId !== undefined && parsed.data.nodeId !== null) {
      const node = await prisma.oBSNode.findFirst({
        where: { id: parsed.data.nodeId, tenantId, isDeleted: false },
      });

      if (!node) {
        return NextResponse.json(
          { message: "Node not found" },
          { status: 400 },
        );
      }
    }

    // Prisma checked updates use relation-level ops, not scalar FK fields.
    // When nodeId is explicitly null, use node: { disconnect: true } instead.
    const updateData: Record<string, unknown> = { ...parsed.data };
    const nodeIdChanging = "nodeId" in updateData;
    const oldNodeId = existing.nodeId;
    const newNodeId = nodeIdChanging ? (updateData.nodeId as string | null) : oldNodeId;

    if (nodeIdChanging) {
      if (updateData.nodeId === null) {
        delete updateData.nodeId;
        updateData.node = { disconnect: true };
      } else {
        const targetNodeId = updateData.nodeId;
        delete updateData.nodeId;
        updateData.node = { connect: { id: targetNodeId } };
      }
    }

    const person = await prisma.$transaction(async (tx) => {
      const updated = await tx.oBSPerson.update({
        where: { id },
        data: updateData,
      });

      // Update ancestor counts when node assignment changes
      if (nodeIdChanging && oldNodeId !== newNodeId) {
        await updateAncestorPeopleCounts(oldNodeId, -1, tenantId, tx);
        await updateAncestorPeopleCounts(newNodeId, 1, tenantId, tx);
      }

      return updated;
    });

    emitOBSEvent(OBS_EVENTS.PERSON_UPDATED, tenantId, person.id, {
      person,
      changes: parsed.data,
    });

    return NextResponse.json({ person });
  } catch (error: unknown) {
    console.error("PATCH /api/org-setup/people/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/people/{id}:
 *   delete:
 *     summary: Soft-delete an OBS person and clear node head references
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Person deleted
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
 *         description: Person not found
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

    const existing = await prisma.oBSPerson.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Person not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.oBSPerson.update({
        where: { id },
        data: { isDeleted: true },
      });
      await tx.oBSNode.updateMany({
        where: { tenantId, nodeHeadPersonId: id, isDeleted: false },
        data: { nodeHeadPersonId: null },
      });
      await updateAncestorPeopleCounts(existing.nodeId, -1, tenantId, tx);
    });

    emitOBSEvent(OBS_EVENTS.PERSON_DELETED, tenantId, id, { personId: id });

    return NextResponse.json({ message: "Person deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/org-setup/people/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
