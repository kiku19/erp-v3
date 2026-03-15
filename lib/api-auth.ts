import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth";

/**
 * Extracts and verifies the tenant from the Authorization header.
 * Returns the decoded payload or a 401 NextResponse.
 */
async function authenticateRequest(
  request: NextRequest,
): Promise<AccessTokenPayload | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    return NextResponse.json(
      { message: "Invalid or expired access token" },
      { status: 401 },
    );
  }
}

/**
 * Type guard to check if the result is an error response.
 */
function isAuthError(
  result: AccessTokenPayload | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export { authenticateRequest, isAuthError };
