-- CreateTable (idempotent — table may already exist from a partial migration)
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- Seed the development tenant so existing users satisfy the FK constraint
INSERT INTO "tenants" ("id", "name", "status", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Development Tenant', 'active', NOW())
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey (idempotent — only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_tenant_id_fkey'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
