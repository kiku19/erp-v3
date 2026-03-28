import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createNodeSchema } from "@/lib/validations/org-setup";
import { emitOBSEvent, OBS_EVENTS } from "@/lib/events/org-events";

/**
 * @swagger
 * /api/org-setup/nodes:
 *   get:
 *     summary: Fetch all OBS nodes with computed resource counts for the authenticated tenant
 *     description: Returns nodes with peopleCount, equipmentCount, materialCount, nodeHeadName, calendarName, and costCenterName. Lightweight endpoint for initial page load.
 *     responses:
 *       200:
 *         description: Nodes with computed counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       type:
 *                         type: string
 *                       parentId:
 *                         type: string
 *                         nullable: true
 *                       nodeHeadPersonId:
 *                         type: string
 *                         nullable: true
 *                       nodeHeadName:
 *                         type: string
 *                         nullable: true
 *                       calendarId:
 *                         type: string
 *                         nullable: true
 *                       calendarName:
 *                         type: string
 *                         nullable: true
 *                       costCenterId:
 *                         type: string
 *                         nullable: true
 *                       costCenterName:
 *                         type: string
 *                         nullable: true
 *                       assignedRoles:
 *                         type: array
 *                       isActive:
 *                         type: boolean
 *                       sortOrder:
 *                         type: integer
 *                       peopleCount:
 *                         type: integer
 *                       equipmentCount:
 *                         type: integer
 *                       materialCount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;

    const rawNodes = await prisma.oBSNode.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        _count: {
          select: {
            people: { where: { isDeleted: false } },
            equipment: { where: { isDeleted: false } },
            materials: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Batch-lookup related names for nodeHead, calendar, costCenter
    const personIds = rawNodes.map((n) => n.nodeHeadPersonId).filter(Boolean) as string[];
    const calendarIds = rawNodes.map((n) => n.calendarId).filter(Boolean) as string[];
    const costCenterIds = rawNodes.map((n) => n.costCenterId).filter(Boolean) as string[];

    const [persons, calendars, costCenters] = await Promise.all([
      personIds.length > 0
        ? prisma.oBSPerson.findMany({
            where: { id: { in: personIds }, tenantId, isDeleted: false },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      calendarIds.length > 0
        ? prisma.calendar.findMany({
            where: { id: { in: calendarIds }, tenantId, isDeleted: false },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      costCenterIds.length > 0
        ? prisma.costCenter.findMany({
            where: { id: { in: costCenterIds }, tenantId, isDeleted: false },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
    ]);

    const personMap = new Map(persons.map((p) => [p.id, p.name]));
    const calendarMap = new Map(calendars.map((c) => [c.id, c.name]));
    const costCenterMap = new Map(costCenters.map((c) => [c.id, c.name]));

    const nodes = rawNodes.map((node) => ({
      id: node.id,
      tenantId: node.tenantId,
      parentId: node.parentId,
      name: node.name,
      code: node.code,
      type: node.type,
      nodeHeadPersonId: node.nodeHeadPersonId,
      nodeHeadName: node.nodeHeadPersonId ? personMap.get(node.nodeHeadPersonId) ?? null : null,
      calendarId: node.calendarId,
      calendarName: node.calendarId ? calendarMap.get(node.calendarId) ?? null : null,
      costCenterId: node.costCenterId,
      costCenterName: node.costCenterId ? costCenterMap.get(node.costCenterId) ?? null : null,
      assignedRoles: node.assignedRoles,
      isActive: node.isActive,
      sortOrder: node.sortOrder,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      peopleCount: node._count.people,
      equipmentCount: node._count.equipment,
      materialCount: node._count.materials,
    }));

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error("GET /api/org-setup/nodes error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

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
