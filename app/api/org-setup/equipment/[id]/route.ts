import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateEquipmentSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/org-setup/equipment/{id}:
 *   patch:
 *     summary: Update an existing equipment entry
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
 *               code:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [safety, power-tool, hand-tool, machinery, vehicle, other]
 *               ownershipType:
 *                 type: string
 *                 enum: [owned, rented, leased]
 *               billingType:
 *                 type: string
 *                 enum: [daily-rental, hourly-rental, pay-per-use, owned-internal, fixed-hire]
 *               standardRate:
 *                 type: number
 *               idleRate:
 *                 type: number
 *                 nullable: true
 *               mobilizationCost:
 *                 type: number
 *                 nullable: true
 *               rentalStart:
 *                 type: string
 *                 nullable: true
 *               rentalEnd:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Equipment updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equipment:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Equipment not found
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
    const parsed = updateEquipmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.oBSEquipment.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Equipment not found" },
        { status: 404 },
      );
    }

    const equipment = await prisma.oBSEquipment.update({
      where: { id },
      data: parsed.data,
    });

    emitOBSEvent(OBS_EVENTS.EQUIPMENT_UPDATED, tenantId, id, { equipment });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("PATCH /api/org-setup/equipment/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/equipment/{id}:
 *   delete:
 *     summary: Soft-delete an equipment entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Equipment deleted
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
 *         description: Equipment not found
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

    const existing = await prisma.oBSEquipment.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Equipment not found" },
        { status: 404 },
      );
    }

    await prisma.oBSEquipment.update({
      where: { id },
      data: { isDeleted: true },
    });

    emitOBSEvent(OBS_EVENTS.EQUIPMENT_DELETED, tenantId, id, { equipmentId: id });

    return NextResponse.json({ message: "Equipment deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/org-setup/equipment/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
