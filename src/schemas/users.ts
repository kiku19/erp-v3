import { z } from "zod";

export const CreateUserRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin", "superadmin"]),
  permissions: z.array(z.string()).optional().default([]),
  timezone: z.string().optional().default("UTC"),
  tenantId: z.string().uuid("tenantId must be a valid UUID").optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const CreatedUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  tenantId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  timezone: z.string(),
  createdAt: z.string(),
});

export type CreatedUser = z.infer<typeof CreatedUserSchema>;
