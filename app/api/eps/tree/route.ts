import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { buildTree } from "@/lib/canvas/build-tree";

/**
 * @swagger
 * /api/eps/tree:
 *   get:
 *     summary: Get the full EPS tree hierarchy for the left panel
 *     responses:
 *       200:
 *         description: Full tree structure
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [eps, node, project]
 *                   children:
 *                     type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const tree = await buildTree(auth.tenantId);
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json(
      { message: "Failed to build tree" },
      { status: 500 },
    );
  }
}
