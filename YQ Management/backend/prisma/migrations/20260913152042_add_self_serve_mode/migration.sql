
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "selfServeModeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfServeOtpEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CheckInOtp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "locationId" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInOtp_phone_tenantId_idx" ON "CheckInOtp"("phone", "tenantId");

-- AddForeignKey
ALTER TABLE "CheckInOtp" ADD CONSTRAINT "CheckInOtp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
