import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { buildTree } from "@/lib/canvas/build-tree";

/**
 * @swagger
 * /api/canvas/state:
 *   get:
 *     summary: Load the full canvas state (tree + version)
 *     responses:
 *       200:
 *         description: Canvas state with version number and full tree
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: integer
 *                 tree:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const [tree, snapshot] = await Promise.all([
      buildTree(auth.tenantId),
      prisma.canvasSnapshot.findUnique({
        where: { tenantId: auth.tenantId },
      }),
    ]);

    return NextResponse.json({
      version: snapshot?.version ?? 0,
      tree,
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to load canvas state" },
      { status: 500 },
    );
  }
}
