-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('SERVICE', 'CHECKPOINT', 'COLLECTION', 'WAITING_PERIOD', 'NOTIFICATION', 'PAYMENT', 'FORM');

-- CreateEnum
CREATE TYPE "StepTrigger" AS ENUM ('AUTOMATIC', 'MANUAL_STAFF', 'MANUAL_CUSTOMER', 'SCHEDULED', 'CONDITION');

-- CreateEnum
CREATE TYPE "VisitStepStatus" AS ENUM ('LOCKED', 'PENDING', 'DEFERRED', 'QUEUED', 'ACTIVE', 'DONE', 'SKIPPED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "StepEventType" AS ENUM ('UNLOCKED', 'QUEUED', 'ACTIVATED', 'QR_SCANNED', 'ENTITLEMENT_REDEEMED', 'OUTCOME_SET', 'COMPLETED', 'SKIPPED', 'DEFERRED', 'EXPIRED', 'STAFF_NOTE', 'PAYMENT_MADE');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "pendingPaymentIntentId" TEXT,
ADD COLUMN     "requiresPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "buildingMap" JSONB,
ADD COLUMN     "totalFloors" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "basePrice" DOUBLE PRECISION,
ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "priceCurrency" TEXT NOT NULL DEFAULT 'ZAR',
ADD COLUMN     "requiresPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "currentStepId" TEXT,
ADD COLUMN     "flowId" TEXT,
ADD COLUMN     "flowStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "ServiceFlow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowPartialCompletion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowStepTemplate" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "StepType" NOT NULL DEFAULT 'SERVICE',
    "trigger" "StepTrigger" NOT NULL DEFAULT 'MANUAL_STAFF',
    "serviceId" TEXT,
    "queueId" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "requiresQrScan" BOOLEAN NOT NULL DEFAULT true,
    "requiresStaffAction" BOOLEAN NOT NULL DEFAULT true,
    "prerequisites" JSONB,
    "deferredByDays" INTEGER,
    "deferredByHours" INTEGER,
    "expiresAfterDays" INTEGER,
    "entitlementUnit" TEXT,
    "entitlementFixed" INTEGER,
    "entitlementFormula" TEXT,
    "allowPartialRedemption" BOOLEAN NOT NULL DEFAULT false,
    "preventDoubleRedemption" BOOLEAN NOT NULL DEFAULT true,
    "customerInstruction" TEXT,
    "staffInstruction" TEXT,
    "locationDescription" TEXT,
    "floorNumber" INTEGER,
    "roomNumber" TEXT,
    "buildingWing" TEXT,
    "mapImageUrl" TEXT,
    "notifyCustomerOnActivation" BOOLEAN NOT NULL DEFAULT true,
    "notificationTemplate" TEXT,
    "notifyStaffOnActivation" BOOLEAN NOT NULL DEFAULT false,
    "stepPrice" DOUBLE PRECISION,
    "stepPriceCurrency" TEXT NOT NULL DEFAULT 'ZAR',
    "isPriceVariable" BOOLEAN NOT NULL DEFAULT false,
    "outcomeOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowStepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowStepTransition" (
    "id" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT,
    "flowId" TEXT NOT NULL,
    "condition" JSONB,
    "label" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FlowStepTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitStep" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "templateStepId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "status" "VisitStepStatus" NOT NULL DEFAULT 'LOCKED',
    "serviceId" TEXT,
    "queueId" TEXT,
    "assignedStaffId" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "deferredUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "quantityAllocated" INTEGER,
    "quantityRedeemed" INTEGER NOT NULL DEFAULT 0,
    "lastRedeemedAt" TIMESTAMP(3),
    "lastRedeemedBy" TEXT,
    "outcome" TEXT,
    "staffNotes" TEXT,
    "amountCharged" DOUBLE PRECISION,
    "paymentRef" TEXT,
    "paymentStatus" TEXT,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitStepEvent" (
    "id" TEXT NOT NULL,
    "visitStepId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "StepEventType" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitStepEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPaymentAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "connectedAccountId" TEXT,
    "accountStatus" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "onboardingCompletedAt" TIMESTAMP(3),
    "stripeOnboardingUrl" TEXT,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "currentlyDue" JSONB,
    "eventuallyDue" JSONB,
    "pendingVerification" JSONB,
    "platformFeePercent" DOUBLE PRECISION,
    "platformFeeFixed" DOUBLE PRECISION,
    "feeMode" TEXT NOT NULL DEFAULT 'PERCENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantPaymentAccountId" TEXT,
    "appointmentId" TEXT,
    "visitId" TEXT,
    "visitStepId" TEXT,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFeeAmount" DOUBLE PRECISION NOT NULL,
    "tenantNetAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripePaymentMethodType" TEXT,
    "description" TEXT,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFlow_serviceId_key" ON "ServiceFlow"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceFlow_tenantId_idx" ON "ServiceFlow"("tenantId");

-- CreateIndex
CREATE INDEX "FlowStepTemplate_flowId_idx" ON "FlowStepTemplate"("flowId");

-- CreateIndex
CREATE INDEX "FlowStepTemplate_serviceId_idx" ON "FlowStepTemplate"("serviceId");

-- CreateIndex
CREATE INDEX "FlowStepTransition_fromStepId_idx" ON "FlowStepTransition"("fromStepId");

-- CreateIndex
CREATE INDEX "FlowStepTransition_flowId_idx" ON "FlowStepTransition"("flowId");

-- CreateIndex
CREATE INDEX "VisitStep_visitId_idx" ON "VisitStep"("visitId");

-- CreateIndex
CREATE INDEX "VisitStep_tenantId_idx" ON "VisitStep"("tenantId");

-- CreateIndex
CREATE INDEX "VisitStep_status_idx" ON "VisitStep"("status");

-- CreateIndex
CREATE INDEX "VisitStep_templateStepId_idx" ON "VisitStep"("templateStepId");

-- CreateIndex
CREATE INDEX "VisitStepEvent_visitStepId_idx" ON "VisitStepEvent"("visitStepId");

-- CreateIndex
CREATE INDEX "VisitStepEvent_visitId_idx" ON "VisitStepEvent"("visitId");

-- CreateIndex
CREATE INDEX "VisitStepEvent_tenantId_idx" ON "VisitStepEvent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPaymentAccount_tenantId_key" ON "TenantPaymentAccount"("tenantId");

-- CreateIndex
CREATE INDEX "TenantPaymentAccount_connectedAccountId_idx" ON "TenantPaymentAccount"("connectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_stripePaymentIntentId_key" ON "BookingPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "BookingPayment_tenantId_idx" ON "BookingPayment"("tenantId");

-- CreateIndex
CREATE INDEX "BookingPayment_tenantPaymentAccountId_idx" ON "BookingPayment"("tenantPaymentAccountId");

-- CreateIndex
CREATE INDEX "BookingPayment_appointmentId_idx" ON "BookingPayment"("appointmentId");

-- CreateIndex
CREATE INDEX "BookingPayment_visitId_idx" ON "BookingPayment"("visitId");

-- CreateIndex
CREATE INDEX "BookingPayment_stripePaymentIntentId_idx" ON "BookingPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Visit_flowId_idx" ON "Visit"("flowId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ServiceFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFlow" ADD CONSTRAINT "ServiceFlow_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStepTemplate" ADD CONSTRAINT "FlowStepTemplate_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ServiceFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStepTransition" ADD CONSTRAINT "FlowStepTransition_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "FlowStepTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStep" ADD CONSTRAINT "VisitStep_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStep" ADD CONSTRAINT "VisitStep_templateStepId_fkey" FOREIGN KEY ("templateStepId") REFERENCES "FlowStepTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStepEvent" ADD CONSTRAINT "VisitStepEvent_visitStepId_fkey" FOREIGN KEY ("visitStepId") REFERENCES "VisitStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPaymentAccount" ADD CONSTRAINT "TenantPaymentAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_tenantPaymentAccountId_fkey" FOREIGN KEY ("tenantPaymentAccountId") REFERENCES "TenantPaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_visitStepId_fkey" FOREIGN KEY ("visitStepId") REFERENCES "VisitStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
