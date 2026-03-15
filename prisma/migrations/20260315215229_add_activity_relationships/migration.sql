-- CreateTable
CREATE TABLE "ActivityRelationship" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL DEFAULT 'FS',
    "lag" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityRelationship_tenantId_projectId_isDeleted_idx" ON "ActivityRelationship"("tenantId", "projectId", "isDeleted");

-- CreateIndex
CREATE INDEX "ActivityRelationship_predecessorId_isDeleted_idx" ON "ActivityRelationship"("predecessorId", "isDeleted");

-- CreateIndex
CREATE INDEX "ActivityRelationship_successorId_isDeleted_idx" ON "ActivityRelationship"("successorId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRelationship_tenantId_predecessorId_successorId_key" ON "ActivityRelationship"("tenantId", "predecessorId", "successorId");

-- AddForeignKey
ALTER TABLE "ActivityRelationship" ADD CONSTRAINT "ActivityRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRelationship" ADD CONSTRAINT "ActivityRelationship_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRelationship" ADD CONSTRAINT "ActivityRelationship_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
