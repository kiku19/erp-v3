-- CreateTable
CREATE TABLE "WbsNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "wbsCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbsNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activityType" TEXT NOT NULL DEFAULT 'task',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "totalFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WbsNode_tenantId_projectId_isDeleted_idx" ON "WbsNode"("tenantId", "projectId", "isDeleted");

-- CreateIndex
CREATE INDEX "WbsNode_parentId_isDeleted_idx" ON "WbsNode"("parentId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "WbsNode_tenantId_projectId_wbsCode_key" ON "WbsNode"("tenantId", "projectId", "wbsCode");

-- CreateIndex
CREATE INDEX "Activity_tenantId_projectId_isDeleted_idx" ON "Activity"("tenantId", "projectId", "isDeleted");

-- CreateIndex
CREATE INDEX "Activity_wbsNodeId_isDeleted_idx" ON "Activity"("wbsNodeId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_tenantId_projectId_activityId_key" ON "Activity"("tenantId", "projectId", "activityId");

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WbsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
