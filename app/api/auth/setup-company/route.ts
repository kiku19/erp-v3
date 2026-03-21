import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companySetupSchema } from "@/lib/validations/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * @swagger
 * /api/auth/setup-company:
 *   post:
 *     summary: Complete company onboarding setup and auto-login the tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - companyName
 *               - companySize
 *               - industry
 *               - userRole
 *               - country
 *               - currency
 *             properties:
 *               tenantId:
 *                 type: string
 *               companyName:
 *                 type: string
 *               companySize:
 *                 type: string
 *               industry:
 *                 type: string
 *               userRole:
 *                 type: string
 *               country:
 *                 type: string
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company setup complete, returns JWT tokens
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
 *       404:
 *         description: Tenant not found or email not verified
 *       409:
 *         description: Onboarding already completed
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = companySetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { tenantId, companyName, companySize, industry, userRole, country, currency } =
      parsed.data;

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, emailVerified: true, isDeleted: false },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "Tenant not found or email not verified" },
        { status: 404 },
      );
    }

    if (tenant.onboardingCompleted) {
      return NextResponse.json(
        { message: "Company setup already completed" },
        { status: 409 },
      );
    }

    const refreshExpiryDays = tenant.refreshTokenExpiryDays;
    const refreshToken = await generateRefreshToken(tenant.id, refreshExpiryDays);
    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000,
    );
    const accessTokenExpiresAt = new Date(
      Date.now() + tenant.accessTokenExpiryMins * 60 * 1000,
    );

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        companyName,
        companySize,
        industry,
        userRole,
        country,
        currency,
        onboardingCompleted: true,
        refreshToken,
        refreshTokenExpiresAt,
        accessTokenExpiresAt,
      },
    });

    const user = await prisma.user.findFirst({
      where: { tenantId, isDeleted: false },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    const accessToken = await generateAccessToken(
      {
        tenantId: tenant.id,
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      tenant.accessTokenExpiryMins,
    );

    const response = NextResponse.json(
      {
        accessToken,
        tenant: {
          id: tenant.id,
          tenantName: tenant.tenantName,
          email: tenant.email,
          role: tenant.role,
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
    console.error("Setup company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
