import { NextRequest, NextResponse } from "next/server";

/**
 * Reads Kong-forwarded identity headers and normalizes them for route handlers.
 * Kong validates the RS256 JWT signature. This middleware NEVER decodes the JWT.
 * If Kong headers are absent the request bypassed Kong — reject with 401.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPrivateRoute = path.startsWith("/api/private/");
  const isAdminRoute = path.startsWith("/api/admin/");

  if (!isPrivateRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Kong post-function plugin injects these after JWT signature validation.
  // Next.js normalizes header names to lowercase.
  const userId = request.headers.get("x-authenticated-userid");
  const tenantId = request.headers.get("x-tenant-id");
  const role = request.headers.get("x-user-role");
  const jti = request.headers.get("x-user-jti");

  if (!userId || !tenantId || !role || !jti) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing identity headers. Request must pass through Kong.",
        },
        traceId: crypto.randomUUID(),
      },
      { status: 401 }
    );
  }

  if (isAdminRoute && role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Admin access required",
        },
        traceId: crypto.randomUUID(),
      },
      { status: 403 }
    );
  }

  const permissions = request.headers.get("x-user-permissions") ?? "";
  const timezone = request.headers.get("x-user-timezone") ?? "UTC";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  requestHeaders.set("x-tenant-id", tenantId);
  requestHeaders.set("x-role", role);
  requestHeaders.set("x-permissions", permissions);
  requestHeaders.set("x-timezone", timezone);
  requestHeaders.set("x-token-jti", jti);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/private/:path*", "/api/admin/:path*"],
};
