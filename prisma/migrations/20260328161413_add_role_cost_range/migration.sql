-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "costRateCurrency" TEXT,
ADD COLUMN     "costRateMax" DOUBLE PRECISION,
ADD COLUMN     "costRateMin" DOUBLE PRECISION;
