import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 24;

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
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
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or tenant not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = resendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        email: parsed.data.email,
        isDeleted: false,
        emailVerified: false,
      },
      select: { id: true, email: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "No unverified account found for this email" },
        { status: 400 },
      );
    }

    await prisma.emailVerificationToken.updateMany({
      where: {
        tenantId: tenant.id,
        usedAt: null,
        isDeleted: false,
      },
      data: { isDeleted: true },
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        tenantId: tenant.id,
        token,
        email: tenant.email,
        expiresAt,
      },
    });

    try {
      await sendVerificationEmail(tenant.email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json(
      { message: "Verification email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
