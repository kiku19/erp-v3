import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/canvas/version:
 *   get:
 *     summary: Lightweight version check for stale detection (polled every 5s)
 *     responses:
 *       200:
 *         description: Current canvas version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: integer
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const snapshot = await prisma.canvasSnapshot.findUnique({
      where: { tenantId: auth.tenantId },
      select: { version: true, updatedAt: true },
    });

    return NextResponse.json({
      version: snapshot?.version ?? 0,
      updatedAt: snapshot?.updatedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch version" },
      { status: 500 },
    );
  }
}
