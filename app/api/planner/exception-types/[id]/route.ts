import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const updateExceptionTypeSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  isDeleted: z.boolean().optional(),
});

/**
 * @swagger
 * /api/planner/exception-types/{id}:
 *   patch:
 *     summary: Update or soft-delete an exception type
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               isDeleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Exception type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 color:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Exception type not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateExceptionTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.exceptionType.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Exception type not found" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.color !== undefined) data.color = parsed.data.color;
    if (parsed.data.isDeleted !== undefined) data.isDeleted = parsed.data.isDeleted;

    const updated = await prisma.exceptionType.update({
      where: { id },
      data,
    });

    return NextResponse.json({ id: updated.id, name: updated.name, color: updated.color });
  } catch (error) {
    console.error("Exception type update error:", error);
    return NextResponse.json(
      { message: "Failed to update exception type" },
      { status: 500 },
    );
  }
}
