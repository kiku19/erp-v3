import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/planner/canvas/version:
 *   get:
 *     summary: Check current planner canvas version for staleness detection
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: integer
 *       400:
 *         description: Missing projectId parameter
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { message: "Missing projectId parameter" },
      { status: 400 },
    );
  }

  try {
    const snapshot = await prisma.plannerSnapshot.findUnique({
      where: { projectId },
    });

    return NextResponse.json({ version: snapshot?.version ?? 0 });
  } catch {
    return NextResponse.json(
      { message: "Failed to check version" },
      { status: 500 },
    );
  }
}
