import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateCostCenterSchema } from "@/lib/validations/cost-center";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/cost-centers/{id}:
 *   patch:
 *     summary: Update an existing cost center
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
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost center updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costCenter:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cost center not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateCostCenterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.costCenter.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Cost center not found" },
        { status: 404 },
      );
    }

    const costCenter = await prisma.costCenter.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ costCenter });
  } catch (error) {
    console.error("PATCH /api/cost-centers/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/cost-centers/{id}:
 *   delete:
 *     summary: Soft-delete a cost center
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cost center deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cost center not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;

    const existing = await prisma.costCenter.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Cost center not found" },
        { status: 404 },
      );
    }

    await prisma.costCenter.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: "Cost center deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/cost-centers/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
