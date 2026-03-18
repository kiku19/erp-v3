-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "durationUnit" TEXT NOT NULL DEFAULT 'days',
ADD COLUMN     "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalWorkHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProjectLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "structure" JSONB NOT NULL,
    "sourceProjectId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectLayout_tenantId_isDeleted_idx" ON "ProjectLayout"("tenantId", "isDeleted");
