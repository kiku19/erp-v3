import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createPersonSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";
import { updateAncestorPeopleCounts } from "@/lib/org-setup/update-ancestor-people-counts";

/**
 * @swagger
 * /api/org-setup/people:
 *   get:
 *     summary: Fetch all OBS people for the authenticated tenant
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by name or employee ID (case-insensitive)
 *       - in: query
 *         name: nodeId
 *         schema:
 *           type: string
 *         description: Filter to only people in this node
 *       - in: query
 *         name: excludeNodeId
 *         schema:
 *           type: string
 *         description: Exclude people assigned to this node
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of people
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 people:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const url = request.nextUrl;
    const search = url.searchParams.get("search");
    const nodeId = url.searchParams.get("nodeId");
    const excludeNodeId = url.searchParams.get("excludeNodeId");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
    const offset = Number(url.searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = {
      tenantId,
      isDeleted: false,
    };

    const andClauses: Record<string, unknown>[] = [];

    if (search) {
      andClauses.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { employeeId: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (nodeId) {
      where.nodeId = nodeId;
    }

    if (excludeNodeId) {
      andClauses.push({
        OR: [
          { nodeId: null },
          { NOT: { nodeId: excludeNodeId } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [people, total] = await Promise.all([
      prisma.oBSPerson.findMany({
        where,
        include: { node: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.oBSPerson.count({ where }),
    ]);

    return NextResponse.json({ people, total });
  } catch (error) {
    console.error("GET /api/org-setup/people error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

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
 *               - name
 *               - employeeId
 *               - email
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

    // Verify node exists only if nodeId is provided
    if (parsed.data.nodeId) {
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

    const person = await prisma.$transaction(async (tx) => {
      const created = await tx.oBSPerson.create({
        data: { tenantId, ...parsed.data },
      });
      await updateAncestorPeopleCounts(created.nodeId, 1, tenantId, tx);
      return created;
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
