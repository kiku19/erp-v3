import { SignJWT, importPKCS8 } from "jose";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const PRIVATE_KEY_PATH = path.join(process.cwd(), "private.pem");

export interface JWTPayload {
  sub: string;
  tenant_id: string;
  role: "user" | "admin" | "superadmin";
  permissions: string[];
  timezone?: string;
  jti: string;
}

/**
 * Converts a duration string like "15m", "1h", "2d" to seconds.
 */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(m|h|d)$/);
  if (!match) throw new Error(`Invalid JWT expiry format: "${expiry}"`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "m") return value * 60;
  if (unit === "h") return value * 3600;
  if (unit === "d") return value * 86400;
  throw new Error(`Unsupported JWT expiry unit: "${unit}"`);
}

/**
 * Signs a JWT using RS256 with the private key.
 * The `iss` claim is read from JWT_ISSUER env var — never hardcoded.
 * Token lifetime is read from JWT_ACCESS_TOKEN_EXPIRY_ADMIN / JWT_ACCESS_TOKEN_EXPIRY_USER env vars.
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  const issuer = process.env.JWT_ISSUER;
  if (!issuer) {
    throw new Error("JWT_ISSUER environment variable is not set");
  }

  const pemContent = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");
  const privateKey = await importPKCS8(pemContent, "RS256");

  const isAdmin = payload.role === "admin" || payload.role === "superadmin";
  const expirationTime = isAdmin
    ? (process.env.JWT_ACCESS_TOKEN_EXPIRY_ADMIN ?? "15m")
    : (process.env.JWT_ACCESS_TOKEN_EXPIRY_USER ?? "1h");

  return new SignJWT({
    tenant_id: payload.tenant_id,
    role: payload.role,
    permissions: payload.permissions,
    timezone: payload.timezone,
    jti: payload.jti,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(payload.sub)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(privateKey);
}

/**
 * Creates both access and refresh tokens for a user
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CreateTokensParams {
  userId: string;
  tenantId: string;
  role: "user" | "admin" | "superadmin";
  permissions: string[];
  timezone?: string;
}

export async function createTokens(params: CreateTokensParams): Promise<TokenData> {
  const jti = randomUUID();

  // Calculate expiration in seconds from env vars
  const isAdmin = params.role === "admin" || params.role === "superadmin";
  const expiry = isAdmin
    ? (process.env.JWT_ACCESS_TOKEN_EXPIRY_ADMIN ?? "15m")
    : (process.env.JWT_ACCESS_TOKEN_EXPIRY_USER ?? "1h");
  const expiresIn = parseExpiryToSeconds(expiry);

  const accessToken = await signJWT({
    sub: params.userId,
    tenant_id: params.tenantId,
    role: params.role,
    permissions: params.permissions,
    timezone: params.timezone,
    jti,
  });

  // Refresh token is a UUID (can be JWT in production)
  const refreshToken = randomUUID();

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Generate refresh token expiry date.
 * Duration is read from JWT_REFRESH_TOKEN_EXPIRY_DAYS env var (default: 7 days).
 */
export function getRefreshTokenExpiry(): Date {
  const days = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY_DAYS ?? "7", 10);
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now;
}
