-- RenameColumn: passwordHash → password_hash for consistency with snake_case convention
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";

-- CreateIndex: tenant_id on users (required by ARCHITECTURE_STANDARDS.md)
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex: user_id on refresh_tokens
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
