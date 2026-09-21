/*
  Warnings:

  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT IF EXISTS "Token_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT IF EXISTS "Token_queueId_fkey";

-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN IF NOT EXISTS "maxCapacity" INTEGER;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "showSupportInfo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "supportEmail" TEXT,
ADD COLUMN IF NOT EXISTS "supportPhone" TEXT;

-- DropTable
DROP TABLE IF EXISTS "Token" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "TokenStatus" CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BlockOff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "queueId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlockOff_tenantId_startTime_idx" ON "BlockOff"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlockOff_locationId_idx" ON "BlockOff"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlockOff_queueId_idx" ON "BlockOff"("queueId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockOff_tenantId_fkey') THEN
        ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockOff_locationId_fkey') THEN
        ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockOff_queueId_fkey') THEN
        ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
