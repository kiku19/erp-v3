import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createMaterialSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

/**
 * @swagger
 * /api/org-setup/materials:
 *   post:
 *     summary: Create a new material entry for the authenticated tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *               - name
 *               - sku
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
 *       201:
 *         description: Material created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 material:
 *                   type: object
 *       400:
 *         description: Validation error or node not found
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Material SKU already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createMaterialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { nodeId, sku } = parsed.data;

    // Verify node exists
    const node = await prisma.oBSNode.findFirst({
      where: { id: nodeId, tenantId, isDeleted: false },
    });

    if (!node) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 400 },
      );
    }

    // Check duplicate SKU
    const duplicate = await prisma.oBSMaterial.findFirst({
      where: { tenantId, sku, isDeleted: false },
    });

    if (duplicate) {
      return NextResponse.json(
        { message: `Material SKU "${sku}" already exists` },
        { status: 409 },
      );
    }

    const material = await prisma.oBSMaterial.create({
      data: { tenantId, ...parsed.data },
    });

    emitOBSEvent(OBS_EVENTS.MATERIAL_CREATED, tenantId, material.id, { material });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error("POST /api/org-setup/materials error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
