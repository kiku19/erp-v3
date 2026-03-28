-- AlterTable
ALTER TABLE "OBSNode" ADD COLUMN     "costCenterId" TEXT;

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCenter_tenantId_isDeleted_idx" ON "CostCenter"("tenantId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_tenantId_code_key" ON "CostCenter"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
