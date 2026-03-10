import { z } from "zod";

// Login request schema
export const LoginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  timezone: z.string().optional().default("UTC"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Login response schema
export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  tenantId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  timezone: z.string(),
  defaultRedirectPath: z.string(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserResponseSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Login response schema without refreshToken (for hybrid token storage - refresh token goes in HttpOnly cookie)
export const LoginResponseWithoutRefreshSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: UserResponseSchema,
});

export type LoginResponseWithoutRefresh = z.infer<typeof LoginResponseWithoutRefreshSchema>;

// Refresh token request schema
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

// Refresh token response schema (without refreshToken - goes in HttpOnly cookie)
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// Logout request schema
export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
