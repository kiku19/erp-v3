import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

/**
 * Test-only endpoint that marks a tenant email as verified.
 * Only available in development/test environments.
 *
 * @swagger
 * /api/test-helpers/verify-email:
 *   post:
 *     summary: "[TEST ONLY] Force-verify a tenant's email"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       403:
 *         description: Not available in production
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const { email } = await request.json();

    const tenant = await prisma.tenant.findFirst({
      where: { email, isDeleted: false },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 },
      );
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { emailVerified: true },
    });

    return NextResponse.json({ message: "Email verified", tenantId: tenant.id });
  } catch (error) {
    console.error("Test helper error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
