import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/org-setup:
 *   get:
 *     summary: Fetch all org setup entities for the authenticated tenant
 *     description: Returns OBS nodes, people, equipment, materials, global calendars, and roles in a single response. Used to hydrate the org setup context on page load.
 *     responses:
 *       200:
 *         description: All org setup entities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 people:
 *                   type: array
 *                   items:
 *                     type: object
 *                 equipment:
 *                   type: array
 *                   items:
 *                     type: object
 *                 materials:
 *                   type: array
 *                   items:
 *                     type: object
 *                 calendars:
 *                   type: array
 *                   items:
 *                     type: object
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
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

    const [nodes, people, equipment, materials, calendars, roles] =
      await Promise.all([
        prisma.oBSNode.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
        prisma.oBSPerson.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
        prisma.oBSEquipment.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
        prisma.oBSMaterial.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
        prisma.calendar.findMany({
          where: { tenantId, isDeleted: false, projectId: null },
          include: { exceptions: { where: { isDeleted: false } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.role.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      nodes,
      people,
      equipment,
      materials,
      calendars,
      roles,
    });
  } catch (error) {
    console.error("GET /api/org-setup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
