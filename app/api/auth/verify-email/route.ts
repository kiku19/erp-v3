import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailSchema } from "@/lib/validations/auth";

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify a user's email address using a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        token: parsed.data.token,
        isDeleted: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "Invalid or expired verification link" },
        { status: 400 },
      );
    }

    await prisma.tenant.update({
      where: { id: record.tenantId },
      data: { emailVerified: true },
    });

    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json(
      { message: "Email verified successfully", tenantId: record.tenantId },
      { status: 200 },
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
