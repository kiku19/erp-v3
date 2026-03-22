import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 24;

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new tenant account and send verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created, verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { fullName, email, password } = parsed.data;

    const existing = await prisma.tenant.findFirst({
      where: { email, isDeleted: false },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "This email is already registered" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          tenantName: fullName,
          email,
          password: hashedPassword,
          emailVerified: false,
        },
      });

      await tx.user.create({
        data: {
          tenantId: newTenant.id,
          email,
          name: fullName,
          role: "admin",
          password: hashedPassword,
        },
      });

      return newTenant;
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        tenantId: tenant.id,
        token,
        email,
        expiresAt,
      },
    });

    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json(
      {
        message: "Account created. Please check your email to verify your account.",
        email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
