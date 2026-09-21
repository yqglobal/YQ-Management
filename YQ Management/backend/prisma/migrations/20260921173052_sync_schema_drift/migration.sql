/*
  Warnings:

  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_queueId_fkey";

-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "maxCapacity" INTEGER;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "showSupportInfo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportEmail" TEXT,
ADD COLUMN     "supportPhone" TEXT;

-- DropTable
DROP TABLE "Token";

-- DropEnum
DROP TYPE "TokenStatus";

-- CreateTable
CREATE TABLE "BlockOff" (
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
CREATE INDEX "BlockOff_tenantId_startTime_idx" ON "BlockOff"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "BlockOff_locationId_idx" ON "BlockOff"("locationId");

-- CreateIndex
CREATE INDEX "BlockOff_queueId_idx" ON "BlockOff"("queueId");

-- AddForeignKey
ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockOff" ADD CONSTRAINT "BlockOff_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
