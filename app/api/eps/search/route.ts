import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/eps/search:
 *   get:
 *     summary: Search across EPS, nodes, and projects
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results grouped by type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eps:
 *                   type: array
 *                 nodes:
 *                   type: array
 *                 projects:
 *                   type: array
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { message: "Search query is required" },
      { status: 400 },
    );
  }

  try {
    const [epsList, nodes, projects] = await Promise.all([
      prisma.eps.findMany({
        where: {
          tenantId: auth.tenantId,
          isDeleted: false,
          name: { contains: q, mode: "insensitive" },
        },
        take: 10,
      }),
      prisma.node.findMany({
        where: {
          tenantId: auth.tenantId,
          isDeleted: false,
          name: { contains: q, mode: "insensitive" },
        },
        include: { eps: { select: { name: true } } },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          tenantId: auth.tenantId,
          isDeleted: false,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { projectId: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          eps: { select: { name: true } },
          node: { select: { name: true } },
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({ eps: epsList, nodes, projects });
  } catch {
    return NextResponse.json(
      { message: "Search failed" },
      { status: 500 },
    );
  }
}
