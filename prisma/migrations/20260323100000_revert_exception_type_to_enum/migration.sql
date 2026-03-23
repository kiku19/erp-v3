-- Add back exceptionType string column
ALTER TABLE "CalendarException" ADD COLUMN "exceptionType_new" TEXT NOT NULL DEFAULT 'Holiday';

-- Populate from the ExceptionType table
UPDATE "CalendarException" ce
SET "exceptionType_new" = COALESCE(
  (SELECT et."name" FROM "ExceptionType" et WHERE et."id" = ce."exceptionTypeId"),
  'Holiday'
);

-- Add time columns
ALTER TABLE "CalendarException" ADD COLUMN "startTime" TEXT;
ALTER TABLE "CalendarException" ADD COLUMN "endTime" TEXT;

-- Drop FK constraint and column
ALTER TABLE "CalendarException" DROP CONSTRAINT IF EXISTS "CalendarException_exceptionTypeId_fkey";
ALTER TABLE "CalendarException" DROP COLUMN "exceptionTypeId";

-- Rename new column
ALTER TABLE "CalendarException" RENAME COLUMN "exceptionType_new" TO "exceptionType";

-- Drop ExceptionType table
DROP TABLE IF EXISTS "ExceptionType";
