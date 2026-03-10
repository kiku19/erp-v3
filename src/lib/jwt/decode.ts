export interface JWTPayload {
  sub: string;
  tenant_id: string;
  role: "user" | "admin" | "superadmin";
  permissions: string[];
  timezone?: string;
  jti: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decodes a JWT token without verification.
 * Uses manual base64 decode since jwtDecode may not be available in edge runtime.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts tenant_id from JWT payload
 */
export function getTenantId(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.tenant_id ?? null;
}

/**
 * Extracts user ID (sub) from JWT payload
 */
export function getUserId(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.sub ?? null;
}

/**
 * Extracts permissions from JWT payload
 */
export function getPermissions(token: string): string[] {
  const payload = decodeJWT(token);
  return payload?.permissions ?? [];
}

/**
 * Extracts timezone from JWT payload
 */
export function getTimezone(token: string): string {
  const payload = decodeJWT(token);
  return payload?.timezone ?? "UTC";
}

/**
 * Extracts role from JWT payload
 */
export function getRole(token: string): "user" | "admin" | "superadmin" | null {
  const payload = decodeJWT(token);
  return payload?.role ?? null;
}
