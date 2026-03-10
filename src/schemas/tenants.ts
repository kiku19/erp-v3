import { z } from "zod";

export const CreateTenantRequestSchema = z.object({
  name: z
    .string()
    .min(2, "Tenant name must be at least 2 characters")
    .max(100, "Tenant name must not exceed 100 characters"),
});

export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;

export const CreatedTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export type CreatedTenant = z.infer<typeof CreatedTenantSchema>;
