import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { reorderEpsSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/eps/reorder:
 *   patch:
 *     summary: Reorder EPS items by providing ordered IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderedIds
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: EPS items reordered
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = reorderEpsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { orderedIds } = parsed.data;

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.eps.updateMany({
          where: { id, tenantId: auth.tenantId, isDeleted: false },
          data: { sortOrder: index },
        }),
      ),
    );

    return NextResponse.json({ message: "Reordered successfully" });
  } catch {
    return NextResponse.json(
      { message: "Failed to reorder EPS" },
      { status: 500 },
    );
  }
}
