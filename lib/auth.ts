import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SALT_ROUNDS = 12;

interface AccessTokenPayload {
  tenantId: string;
  email: string;
  role: string;
}

function getAccessSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function getRefreshSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET);
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function generateAccessToken(
  payload: AccessTokenPayload,
  expiryMins: number,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiryMins}m`)
    .sign(getAccessSecret());
}

async function generateRefreshToken(
  tenantId: string,
  expiryDays: number,
): Promise<string> {
  return new SignJWT({ tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiryDays}d`)
    .sign(getRefreshSecret());
}

async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret());
  return payload as unknown as AccessTokenPayload;
}

async function verifyRefreshToken(token: string): Promise<{ tenantId: string }> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  return payload as unknown as { tenantId: string };
}

export {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type AccessTokenPayload,
};
