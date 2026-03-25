-- CreateTable
CREATE TABLE "OBSNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIVISION',
    "nodeHeadPersonId" TEXT,
    "calendarId" TEXT,
    "assignedRoles" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OBSNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OBSPerson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "standardRate" DOUBLE PRECISION,
    "overtimeRate" DOUBLE PRECISION,
    "overtimePay" BOOLEAN NOT NULL DEFAULT false,
    "monthlySalary" DOUBLE PRECISION,
    "dailyAllocation" DOUBLE PRECISION,
    "contractAmount" DOUBLE PRECISION,
    "employmentType" TEXT NOT NULL DEFAULT 'full-time',
    "joinDate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OBSPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OBSEquipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "ownershipType" TEXT NOT NULL DEFAULT 'owned',
    "billingType" TEXT NOT NULL DEFAULT 'owned-internal',
    "standardRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "idleRate" DOUBLE PRECISION,
    "mobilizationCost" DOUBLE PRECISION,
    "rentalStart" TIMESTAMP(3),
    "rentalEnd" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OBSEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OBSMaterial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'consumable',
    "uom" TEXT NOT NULL DEFAULT 'piece',
    "standardCostPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costBasis" TEXT NOT NULL DEFAULT 'fixed',
    "wastageStandardPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER,
    "reorderPointQty" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OBSMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OBSNode_tenantId_isDeleted_idx" ON "OBSNode"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "OBSNode_tenantId_parentId_isDeleted_idx" ON "OBSNode"("tenantId", "parentId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "OBSNode_tenantId_code_key" ON "OBSNode"("tenantId", "code");

-- CreateIndex
CREATE INDEX "OBSPerson_tenantId_isDeleted_idx" ON "OBSPerson"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "OBSPerson_tenantId_nodeId_isDeleted_idx" ON "OBSPerson"("tenantId", "nodeId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "OBSPerson_tenantId_employeeId_key" ON "OBSPerson"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "OBSEquipment_tenantId_isDeleted_idx" ON "OBSEquipment"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "OBSEquipment_tenantId_nodeId_isDeleted_idx" ON "OBSEquipment"("tenantId", "nodeId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "OBSEquipment_tenantId_code_key" ON "OBSEquipment"("tenantId", "code");

-- CreateIndex
CREATE INDEX "OBSMaterial_tenantId_isDeleted_idx" ON "OBSMaterial"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "OBSMaterial_tenantId_nodeId_isDeleted_idx" ON "OBSMaterial"("tenantId", "nodeId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "OBSMaterial_tenantId_sku_key" ON "OBSMaterial"("tenantId", "sku");

-- AddForeignKey
ALTER TABLE "OBSNode" ADD CONSTRAINT "OBSNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OBSPerson" ADD CONSTRAINT "OBSPerson_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "OBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OBSEquipment" ADD CONSTRAINT "OBSEquipment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "OBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OBSMaterial" ADD CONSTRAINT "OBSMaterial_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "OBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
