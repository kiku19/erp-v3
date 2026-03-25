import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateMaterialSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/org-setup/materials/{id}:
 *   patch:
 *     summary: Update an existing material entry
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
 *               sku:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [consumable, raw-material, component, chemical]
 *               uom:
 *                 type: string
 *                 enum: [litre, kg, bag, piece, m2, m3, box, roll, set]
 *               standardCostPerUnit:
 *                 type: number
 *               costBasis:
 *                 type: string
 *                 enum: [fixed, market-rate, contract-rate]
 *               wastageStandardPct:
 *                 type: number
 *               leadTimeDays:
 *                 type: integer
 *                 nullable: true
 *               reorderPointQty:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Material updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 material:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Material not found
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
    const parsed = updateMaterialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.oBSMaterial.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Material not found" },
        { status: 404 },
      );
    }

    const material = await prisma.oBSMaterial.update({
      where: { id },
      data: parsed.data,
    });

    emitOBSEvent(OBS_EVENTS.MATERIAL_UPDATED, tenantId, id, { material });

    return NextResponse.json({ material });
  } catch (error) {
    console.error("PATCH /api/org-setup/materials/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/materials/{id}:
 *   delete:
 *     summary: Soft-delete a material entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material deleted
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
 *         description: Material not found
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

    const existing = await prisma.oBSMaterial.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Material not found" },
        { status: 404 },
      );
    }

    await prisma.oBSMaterial.update({
      where: { id },
      data: { isDeleted: true },
    });

    emitOBSEvent(OBS_EVENTS.MATERIAL_DELETED, tenantId, id, { materialId: id });

    return NextResponse.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/org-setup/materials/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
