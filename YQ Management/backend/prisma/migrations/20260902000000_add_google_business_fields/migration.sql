-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "annualDiscountPercent" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "enableSmartReviews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "googleReviewLink" TEXT,
ADD COLUMN     "reviewWaitThresholdMins" INTEGER NOT NULL DEFAULT 15;

-- CreateIndex
CREATE UNIQUE INDEX "Message_whatsappId_key" ON "Message"("whatsappId");

