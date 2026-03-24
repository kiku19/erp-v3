import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateRoleSchema } from "@/lib/validations/role";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/roles/{id}:
 *   patch:
 *     summary: Update an existing role
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
 *               level:
 *                 type: string
 *                 enum: [Junior, Mid, Senior, Lead, Principal]
 *               defaultPayType:
 *                 type: string
 *                 enum: [hourly, salaried, contract]
 *               overtimeEligible:
 *                 type: boolean
 *               skillTags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
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
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.role.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Role not found" },
        { status: 404 },
      );
    }

    const role = await prisma.role.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("PATCH /api/roles/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Soft-delete a role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted
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
 *         description: Role not found
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

    const existing = await prisma.role.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Role not found" },
        { status: 404 },
      );
    }

    await prisma.role.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
