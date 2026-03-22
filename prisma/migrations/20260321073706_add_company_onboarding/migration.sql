-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userRole" TEXT;
