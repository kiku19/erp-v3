import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createNodeSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

/**
 * @swagger
 * /api/org-setup/nodes:
 *   post:
 *     summary: Create a new OBS node for the authenticated tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               code:
 *                 type: string
 *                 minLength: 1
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
 *                   properties:
 *                     roleId:
 *                       type: string
 *                     standardRate:
 *                       type: number
 *                       nullable: true
 *                     overtimeRate:
 *                       type: number
 *                       nullable: true
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Node created successfully
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
 *       409:
 *         description: Node code already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { code } = parsed.data;

    // Check for duplicate code within the tenant
    const existing = await prisma.oBSNode.findFirst({
      where: { tenantId, code, isDeleted: false },
    });

    if (existing) {
      return NextResponse.json(
        { message: `Node code "${code}" already exists` },
        { status: 409 },
      );
    }

    const node = await prisma.oBSNode.create({
      data: {
        tenantId,
        ...parsed.data,
      },
    });

    emitOBSEvent(OBS_EVENTS.NODE_CREATED, tenantId, node.id, { node });

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error("POST /api/org-setup/nodes error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
