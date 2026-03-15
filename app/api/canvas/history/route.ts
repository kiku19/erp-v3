import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { canvasHistoryQuerySchema } from "@/lib/validations/canvas";

/**
 * @swagger
 * /api/canvas/history:
 *   get:
 *     summary: Get paginated event history for the canvas
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated event list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const url = new URL(request.url);
    const parsed = canvasHistoryQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const page = parsed.success ? parsed.data.page : 1;
    const limit = parsed.success ? parsed.data.limit : 50;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.canvasEvent.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.canvasEvent.count({
        where: { tenantId: auth.tenantId },
      }),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
