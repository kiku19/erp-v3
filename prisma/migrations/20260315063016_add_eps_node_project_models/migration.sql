-- CreateTable
CREATE TABLE "Eps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "epsId" TEXT NOT NULL,
    "parentNodeId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "epsId" TEXT NOT NULL,
    "nodeId" TEXT,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "responsibleManager" TEXT,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "percentDone" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eac" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Eps_tenantId_isDeleted_idx" ON "Eps"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "Node_tenantId_isDeleted_idx" ON "Node"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "Node_epsId_isDeleted_idx" ON "Node"("epsId", "isDeleted");

-- CreateIndex
CREATE INDEX "Node_parentNodeId_isDeleted_idx" ON "Node"("parentNodeId", "isDeleted");

-- CreateIndex
CREATE INDEX "Project_tenantId_isDeleted_idx" ON "Project"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "Project_epsId_isDeleted_idx" ON "Project"("epsId", "isDeleted");

-- CreateIndex
CREATE INDEX "Project_nodeId_isDeleted_idx" ON "Project"("nodeId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_projectId_key" ON "Project"("tenantId", "projectId");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_epsId_fkey" FOREIGN KEY ("epsId") REFERENCES "Eps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_epsId_fkey" FOREIGN KEY ("epsId") REFERENCES "Eps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;
