-- CreateTable
CREATE TABLE "ExceptionType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExceptionType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExceptionType_tenantId_name_key" ON "ExceptionType"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ExceptionType_tenantId_isDeleted_idx" ON "ExceptionType"("tenantId", "isDeleted");

-- AddForeignKey
ALTER TABLE "ExceptionType" ADD CONSTRAINT "ExceptionType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default exception types for each existing tenant
INSERT INTO "ExceptionType" ("id", "tenantId", "name", "color", "isDeleted", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    t."id",
    type_data."name",
    type_data."color",
    false,
    NOW(),
    NOW()
FROM "Tenant" t
CROSS JOIN (
    VALUES ('Holiday', 'error'), ('Non-Working', 'warning'), ('Half Day', 'info')
) AS type_data("name", "color");

-- Add exceptionTypeId column as nullable first
ALTER TABLE "CalendarException" ADD COLUMN "exceptionTypeId" TEXT;

-- Add reason column
ALTER TABLE "CalendarException" ADD COLUMN "reason" TEXT;

-- Populate exceptionTypeId from existing exceptionType string values
UPDATE "CalendarException" ce
SET "exceptionTypeId" = et."id"
FROM "ExceptionType" et
WHERE et."tenantId" = ce."tenantId"
  AND et."name" = ce."exceptionType";

-- For any rows that didn't match (shouldn't happen but safety), assign Holiday
UPDATE "CalendarException" ce
SET "exceptionTypeId" = (
    SELECT et."id" FROM "ExceptionType" et
    WHERE et."tenantId" = ce."tenantId" AND et."name" = 'Holiday'
    LIMIT 1
)
WHERE ce."exceptionTypeId" IS NULL;

-- Make exceptionTypeId required
ALTER TABLE "CalendarException" ALTER COLUMN "exceptionTypeId" SET NOT NULL;

-- Drop old exceptionType column
ALTER TABLE "CalendarException" DROP COLUMN "exceptionType";

-- AddForeignKey
ALTER TABLE "CalendarException" ADD CONSTRAINT "CalendarException_exceptionTypeId_fkey" FOREIGN KEY ("exceptionTypeId") REFERENCES "ExceptionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
