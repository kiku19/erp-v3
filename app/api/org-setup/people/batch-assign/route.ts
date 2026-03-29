import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { batchAssignPeopleSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";
import { updateAncestorPeopleCounts } from "@/lib/org-setup/update-ancestor-people-counts";

/**
 * @swagger
 * /api/org-setup/people/batch-assign:
 *   post:
 *     summary: Batch assign people to a target node
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personIds
 *               - targetNodeId
 *             properties:
 *               personIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetNodeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: People assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: integer
 *                 people:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Validation error, target node not found, or invalid person IDs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = batchAssignPeopleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { personIds, targetNodeId } = parsed.data;

    // Verify target node exists
    const node = await prisma.oBSNode.findFirst({
      where: { id: targetNodeId, tenantId, isDeleted: false },
    });

    if (!node) {
      return NextResponse.json(
        { message: "Target node not found" },
        { status: 400 },
      );
    }

    // Verify all person IDs exist and belong to tenant
    const existingPeople = await prisma.oBSPerson.findMany({
      where: { id: { in: personIds }, tenantId, isDeleted: false },
    });

    if (existingPeople.length !== personIds.length) {
      const foundIds = new Set(existingPeople.map((p) => p.id));
      const missingIds = personIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { message: `People not found: ${missingIds.join(", ")}` },
        { status: 400 },
      );
    }

    // Batch update within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Decrement old node ancestor counts for people moving from other nodes
      const sourceNodeCounts = new Map<string, number>();
      for (const person of existingPeople) {
        if (person.nodeId && person.nodeId !== targetNodeId) {
          sourceNodeCounts.set(person.nodeId, (sourceNodeCounts.get(person.nodeId) ?? 0) + 1);
        }
      }
      for (const [sourceNodeId, count] of sourceNodeCounts) {
        await updateAncestorPeopleCounts(sourceNodeId, -count, tenantId, tx);
      }

      const updateResult = await tx.oBSPerson.updateMany({
        where: { id: { in: personIds }, tenantId, isDeleted: false },
        data: { nodeId: targetNodeId },
      });

      // Increment target node ancestor counts for all assigned people
      await updateAncestorPeopleCounts(targetNodeId, updateResult.count, tenantId, tx);

      const updatedPeople = await tx.oBSPerson.findMany({
        where: { id: { in: personIds }, tenantId, isDeleted: false },
      });

      return { count: updateResult.count, people: updatedPeople };
    });

    for (const person of result.people) {
      emitOBSEvent(OBS_EVENTS.PERSON_UPDATED, tenantId, person.id, {
        person,
        changes: { nodeId: targetNodeId },
      });
    }

    return NextResponse.json({
      updated: result.count,
      people: result.people,
    });
  } catch (error) {
    console.error("POST /api/org-setup/people/batch-assign error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
