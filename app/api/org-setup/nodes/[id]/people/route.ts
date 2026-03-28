import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/org-setup/nodes/{id}/people:
 *   get:
 *     summary: Fetch paginated people for a specific OBS node
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated people list
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
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id: nodeId } = await context.params;
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
    const offset = Number(url.searchParams.get("offset")) || 0;

    const node = await prisma.oBSNode.findFirst({
      where: { id: nodeId, tenantId, isDeleted: false },
      select: { id: true },
    });

    if (!node) {
      return NextResponse.json({ message: "Node not found" }, { status: 404 });
    }

    const where = { tenantId, nodeId, isDeleted: false };

    const [people, total] = await Promise.all([
      prisma.oBSPerson.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oBSPerson.count({ where }),
    ]);

    return NextResponse.json({ people, total });
  } catch (error) {
    console.error("GET /api/org-setup/nodes/[id]/people error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
