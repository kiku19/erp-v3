import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get("cookie");
    const refreshTokenValue = parseCookie(cookieHeader, "refreshToken");

    if (!refreshTokenValue) {
      return NextResponse.json(
        { message: "No refresh token provided" },
        { status: 401 },
      );
    }

    let payload: { tenantId: string };
    try {
      payload = await verifyRefreshToken(refreshTokenValue);
    } catch {
      return NextResponse.json(
        { message: "Invalid refresh token" },
        { status: 401 },
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        id: payload.tenantId,
        isDeleted: false,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 401 },
      );
    }

    if (tenant.refreshToken !== refreshTokenValue) {
      return NextResponse.json(
        { message: "Refresh token mismatch" },
        { status: 401 },
      );
    }

    if (
      tenant.refreshTokenExpiresAt &&
      tenant.refreshTokenExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { message: "Refresh token expired" },
        { status: 401 },
      );
    }

    // Look up the user for this tenant to include userId in the token
    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: tenant.email, isDeleted: false },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 401 },
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

    const newRefreshToken = await generateRefreshToken(
      tenant.id,
      tenant.refreshTokenExpiryDays,
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + tenant.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    );
    const accessTokenExpiresAt = new Date(
      Date.now() + tenant.accessTokenExpiryMins * 60 * 1000,
    );

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        refreshToken: newRefreshToken,
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

    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: tenant.refreshTokenExpiryDays * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

function parseCookie(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : undefined;
}
