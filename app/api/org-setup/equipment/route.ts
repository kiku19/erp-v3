import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createEquipmentSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

/**
 * @swagger
 * /api/org-setup/equipment:
 *   post:
 *     summary: Create a new equipment entry for the authenticated tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *               - name
 *               - code
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
 *       201:
 *         description: Equipment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equipment:
 *                   type: object
 *       400:
 *         description: Validation error or node not found
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Equipment code already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createEquipmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { nodeId, code } = parsed.data;

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

    // Check duplicate code
    const duplicate = await prisma.oBSEquipment.findFirst({
      where: { tenantId, code, isDeleted: false },
    });

    if (duplicate) {
      return NextResponse.json(
        { message: `Equipment code "${code}" already exists` },
        { status: 409 },
      );
    }

    const equipment = await prisma.oBSEquipment.create({
      data: { tenantId, ...parsed.data },
    });

    emitOBSEvent(OBS_EVENTS.EQUIPMENT_CREATED, tenantId, equipment.id, { equipment });

    return NextResponse.json({ equipment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/org-setup/equipment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
