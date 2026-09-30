-- AlterEnum
ALTER TYPE "VisitState" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "FlowStepTemplate" ADD COLUMN     "expiresAfterHours" INTEGER;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "annualPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "allowOfflinePayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TenantPaymentAccount" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ZAR';
