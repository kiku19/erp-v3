-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "accessTokenExpiryMins" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "refreshTokenExpiryDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "rememberMeExpiryDays" INTEGER NOT NULL DEFAULT 30;
