import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updatePersonSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

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

    const person = await prisma.oBSPerson.update({
      where: { id },
      data: parsed.data,
    });

    emitOBSEvent(OBS_EVENTS.PERSON_UPDATED, tenantId, person.id, {
      person,
      changes: parsed.data,
    });

    return NextResponse.json({ person });
  } catch (error) {
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

    await prisma.$transaction([
      prisma.oBSPerson.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.oBSNode.updateMany({
        where: { tenantId, nodeHeadPersonId: id, isDeleted: false },
        data: { nodeHeadPersonId: null },
      }),
    ]);

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
