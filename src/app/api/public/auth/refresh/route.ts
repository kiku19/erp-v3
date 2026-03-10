import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokens, getRefreshTokenExpiry } from "@/lib/jwt/sign";
import { RefreshTokenResponseSchema } from "@/schemas/auth";
import {
  successResponse,
  errorResponse,
  validateTimezoneHeader,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Validate X-Timezone header if present
    const timezoneError = validateTimezoneHeader(request);
    if (timezoneError) return timezoneError;

    // Read refresh token from cookie (hybrid token storage)
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return errorResponse("REFRESH_TOKEN_MISSING", "Refresh token is required", 401);
    }

    // Find and validate refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      return errorResponse("INVALID_TOKEN", "Invalid refresh token", 401);
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return errorResponse("TOKEN_EXPIRED", "Refresh token has expired", 401);
    }

    // Generate new tokens before the transaction (createTokens is async, not a Prisma op)
    const tokens = await createTokens({
      userId: storedToken.user.id,
      tenantId: storedToken.user.tenantId,
      role: storedToken.user.role as "user" | "admin" | "superadmin",
      permissions: storedToken.user.permissions as string[],
      timezone: storedToken.user.timezone,
    });

    // Atomically rotate: delete old token and create new one in a single transaction
    const expiresAt = getRefreshTokenExpiry();
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          token: tokens.refreshToken,
          expiresAt,
        },
      }),
    ]);

    // Build response (without refreshToken - it's set as HttpOnly cookie)
    const responseData = {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };

    const validatedResponse = RefreshTokenResponseSchema.parse(responseData);

    const response = successResponse(validatedResponse, request);

    // Rotate refresh token cookie
    response.cookies.set("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return errorResponse("INTERNAL_ERROR", "An error occurred during token refresh", 500);
  }
}
