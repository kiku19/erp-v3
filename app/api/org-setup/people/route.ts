import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createPersonSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

/**
 * @swagger
 * /api/org-setup/people:
 *   post:
 *     summary: Create a new OBS person for the authenticated tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *               - name
 *               - employeeId
 *               - email
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
 *       201:
 *         description: Person created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 person:
 *                   type: object
 *       400:
 *         description: Validation error or node not found
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Employee ID already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createPersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    // Verify node exists
    const node = await prisma.oBSNode.findFirst({
      where: { id: parsed.data.nodeId, tenantId, isDeleted: false },
    });

    if (!node) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 400 },
      );
    }

    // Check duplicate employeeId
    const duplicate = await prisma.oBSPerson.findFirst({
      where: { tenantId, employeeId: parsed.data.employeeId, isDeleted: false },
    });

    if (duplicate) {
      return NextResponse.json(
        { message: `Employee ID "${parsed.data.employeeId}" already exists` },
        { status: 409 },
      );
    }

    const person = await prisma.oBSPerson.create({
      data: { tenantId, ...parsed.data },
    });

    emitOBSEvent(OBS_EVENTS.PERSON_CREATED, tenantId, person.id, { person });

    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    console.error("POST /api/org-setup/people error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
