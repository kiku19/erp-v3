-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "calendarId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "defaultCalendarId" TEXT;

-- CreateTable
CREATE TABLE "Calendar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'global',
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "workDays" JSONB NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "exceptionType" TEXT NOT NULL DEFAULT 'Holiday',
    "workHours" DOUBLE PRECISION,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Calendar_tenantId_isDeleted_idx" ON "Calendar"("tenantId", "isDeleted");

-- CreateIndex
CREATE INDEX "Calendar_tenantId_projectId_isDeleted_idx" ON "Calendar"("tenantId", "projectId", "isDeleted");

-- CreateIndex
CREATE INDEX "CalendarException_tenantId_calendarId_isDeleted_idx" ON "CalendarException"("tenantId", "calendarId", "isDeleted");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_defaultCalendarId_fkey" FOREIGN KEY ("defaultCalendarId") REFERENCES "Calendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarException" ADD CONSTRAINT "CalendarException_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
