import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     tenantName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, password, rememberMe } = parsed.data;

    // Look up User first, then get Tenant
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: { tenant: true },
    });

    if (!user || user.tenant.isDeleted) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const tenant = user.tenant;

    if (!tenant.emailVerified) {
      return NextResponse.json(
        { message: "Please verify your email before signing in", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 },
      );
    }

    const refreshExpiryDays = rememberMe
      ? tenant.rememberMeExpiryDays
      : tenant.refreshTokenExpiryDays;

    const accessToken = await generateAccessToken(
      {
        tenantId: tenant.id,
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      tenant.accessTokenExpiryMins,
    );

    const refreshToken = await generateRefreshToken(tenant.id, refreshExpiryDays);

    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000,
    );
    const accessTokenExpiresAt = new Date(
      Date.now() + tenant.accessTokenExpiryMins * 60 * 1000,
    );

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        refreshToken,
        refreshTokenExpiresAt,
        accessTokenExpiresAt,
      },
    });

    const response = NextResponse.json(
      {
        accessToken,
        tenant: {
          id: tenant.id,
          tenantName: tenant.tenantName,
          email: tenant.email,
          role: tenant.role,
          onboardingCompleted: tenant.onboardingCompleted,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: refreshExpiryDays * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
