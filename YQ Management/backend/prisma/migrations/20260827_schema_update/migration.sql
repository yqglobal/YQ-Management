-- CreateEnum (safe: skips if already exists)
DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'MISSED', 'PENDING_APPROVAL', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (safe: skips if already exists)
DO $$ BEGIN
  CREATE TYPE "VisitSource" AS ENUM ('APPOINTMENT', 'WALK_IN', 'WEBSITE', 'WHATSAPP', 'PHONE', 'RECEPTION', 'KIOSK', 'QR', 'API');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (safe: skips if already exists)
DO $$ BEGIN
  CREATE TYPE "VisitState" AS ENUM ('CREATED', 'SCHEDULED', 'CHECKED_IN', 'WAITING', 'CALLED', 'ASSIGNED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'MISSED', 'ON_HOLD', 'ABANDONED', 'TRANSFERRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (safe: skips if already exists)
DO $$ BEGIN
  CREATE TYPE "PolicyType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'REFUND_POLICY', 'DATA_PROCESSING_AGREEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProviderName_new" AS ENUM ('OZOW');
ALTER TABLE "PaymentProvider" ALTER COLUMN "name" TYPE "PaymentProviderName_new" USING ("name"::text::"PaymentProviderName_new");
ALTER TYPE "PaymentProviderName" RENAME TO "PaymentProviderName_old";
ALTER TYPE "PaymentProviderName_new" RENAME TO "PaymentProviderName";
DROP TYPE "public"."PaymentProviderName_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'TENANT_ADMIN';
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT', 'PAST_DUE');
ALTER TABLE "public"."Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "public"."SubscriptionStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WebhookEventType_new" AS ENUM ('PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_PENDING');
ALTER TABLE "WebhookEvent" ALTER COLUMN "eventType" TYPE "WebhookEventType_new" USING ("eventType"::text::"WebhookEventType_new");
ALTER TYPE "WebhookEventType" RENAME TO "WebhookEventType_old";
ALTER TYPE "WebhookEventType_new" RENAME TO "WebhookEventType";
DROP TYPE "public"."WebhookEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WebhookProcessingStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');
ALTER TABLE "public"."WebhookEvent" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "WebhookEvent" ALTER COLUMN "processingStatus" TYPE "WebhookProcessingStatus_new" USING ("processingStatus"::text::"WebhookProcessingStatus_new");
ALTER TYPE "WebhookProcessingStatus" RENAME TO "WebhookProcessingStatus_old";
ALTER TYPE "WebhookProcessingStatus_new" RENAME TO "WebhookProcessingStatus";
DROP TYPE "public"."WebhookProcessingStatus_old";
ALTER TABLE "WebhookEvent" ALTER COLUMN "processingStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "PersonalSettings" DROP CONSTRAINT "PersonalSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEndpoint" DROP CONSTRAINT "WebhookEndpoint_workspaceId_fkey";

-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_workspaceId_idx";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_idx";

-- DropIndex
DROP INDEX "Invoice_workspaceId_idx";

-- DropIndex
DROP INDEX "Message_tokenId_idx";

-- DropIndex
DROP INDEX "PaymentProvider_name_key";

-- DropIndex
DROP INDEX "Queue_workspaceId_idx";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- DropIndex
DROP INDEX "Subscription_status_idx";

-- DropIndex
DROP INDEX "Subscription_workspaceId_idx";

-- DropIndex
DROP INDEX "Subscription_workspaceId_key";

-- DropIndex
DROP INDEX "WebhookEndpoint_workspaceId_idx";

-- DropIndex
DROP INDEX "WebhookEvent_idempotencyKey_idx";

-- DropIndex
DROP INDEX "WebhookEvent_processingStatus_idx";

-- DropIndex
DROP INDEX "WebhookEvent_providerEventId_idx";

-- DropIndex
DROP INDEX "WebhookEvent_providerEventId_provider_key";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "entity",
DROP COLUMN "workspaceId",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "endpoint" TEXT,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "resource" TEXT,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "statusCode" INTEGER,
ADD COLUMN     "tenantId" TEXT,
DROP COLUMN "action",
ADD COLUMN     "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "createdBy",
DROP COLUMN "revoked",
ADD COLUMN     "allowedLocationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedAt" TIMESTAMP(3),
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "maxUses" SET DEFAULT 1,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "invoiceNumber",
DROP COLUMN "metadata",
DROP COLUMN "subscriptionId",
DROP COLUMN "transactionId",
DROP COLUMN "workspaceId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "tokenId",
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "visitId" TEXT;

-- AlterTable
ALTER TABLE "PaymentProvider" DROP COLUMN "apiKey",
DROP COLUMN "isActive",
DROP COLUMN "webhookSecret",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "status",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "interval" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "maxQueues" INTEGER,
ADD COLUMN     "maxVisits" INTEGER,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'standard',
DROP COLUMN "billingInterval",
ADD COLUMN     "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
ALTER COLUMN "price" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "allowAppointments",
DROP COLUMN "appointmentGranularityMins",
DROP COLUMN "requireManualCheckIn",
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "tokenDisplayConfig" JSONB,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "startedAt",
DROP COLUMN "trialDays",
DROP COLUMN "workspaceId",
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ozowSubscriptionId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
DROP COLUMN "billingInterval",
ADD COLUMN     "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
ALTER COLUMN "currentPeriodStart" SET NOT NULL,
ALTER COLUMN "currentPeriodStart" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "currentPeriodEnd" SET NOT NULL;

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "rawProviderResponse" JSONB,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status",
ADD COLUMN     "allowedLocationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "personalSettings" JSONB,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WebhookEndpoint" DROP COLUMN "workspaceId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "amountValid",
DROP COLUMN "currencyValid",
DROP COLUMN "idempotencyKey",
DROP COLUMN "paymentRefValid",
DROP COLUMN "providerEventId",
DROP COLUMN "retryCount",
DROP COLUMN "signature",
DROP COLUMN "subscriptionId",
DROP COLUMN "subscriptionValid",
DROP COLUMN "transactionValid",
DROP COLUMN "updatedAt",
DROP COLUMN "workspaceValid",
ADD COLUMN     "error" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
DROP COLUMN "provider",
ADD COLUMN     "provider" TEXT,
ALTER COLUMN "signatureValid" DROP NOT NULL,
ALTER COLUMN "signatureValid" DROP DEFAULT,
DROP COLUMN "processingResult",
ADD COLUMN     "processingResult" JSONB;

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "chatbotConfig",
DROP COLUMN "chatbotEnabled",
DROP COLUMN "subscriptionStatus",
DROP COLUMN "whatsappConnected",
DROP COLUMN "whatsappInstanceId",
DROP COLUMN "whatsappPhone",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "BillingSettings";

-- DropTable
DROP TABLE "PaymentMethod";

-- DropTable
DROP TABLE "PersonalSettings";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "WorkspaceUsage";

-- DropEnum
DROP TYPE "AuditAction";

-- DropEnum
DROP TYPE "BillingInterval";

-- DropEnum
DROP TYPE "PlanStatus";

-- DropEnum
DROP TYPE "PlanType";

-- DropEnum
DROP TYPE "TransactionStatus";

-- DropEnum
DROP TYPE "UserStatus";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "branding" JSONB,
    "whatsappInstanceId" TEXT,
    "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "chatbotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "chatbotConfig" JSONB,
    "customerExperience" JSONB,
    "googleBusinessConnected" BOOLEAN NOT NULL DEFAULT false,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "googleLocationId" TEXT,
    "appointmentApprovalMode" TEXT NOT NULL DEFAULT 'AUTO',
    "operatingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autonomousEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "branches" INTEGER NOT NULL DEFAULT 0,
    "whatsappMessages" INTEGER NOT NULL DEFAULT 0,
    "aiRequests" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "activeQueues" INTEGER NOT NULL DEFAULT 0,
    "queueJoins" INTEGER NOT NULL DEFAULT 0,
    "operators" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "businessHours" JSONB,
    "exceptionDates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expectedDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferDuration" INTEGER NOT NULL DEFAULT 0,
    "concurrentSlots" INTEGER NOT NULL DEFAULT 1,
    "minDuration" INTEGER,
    "maxDuration" INTEGER,
    "formConfig" JSONB,
    "allowAppointments" BOOLEAN NOT NULL DEFAULT false,
    "requireManualCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "appointmentGranularityMins" INTEGER NOT NULL DEFAULT 15,
    "avgActualDurationMins" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "resourceId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "bookingSource" "VisitSource" NOT NULL DEFAULT 'APPOINTMENT',
    "customerNotes" TEXT,
    "formData" JSONB,
    "reminderStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "source" "VisitSource" NOT NULL DEFAULT 'WALK_IN',
    "scheduledTime" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "checkInTime" TIMESTAMP(3),
    "waitingStart" TIMESTAMP(3),
    "serviceStart" TIMESTAMP(3),
    "serviceEnd" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedStaffId" TEXT,
    "assignedResourceId" TEXT,
    "currentState" "VisitState" NOT NULL DEFAULT 'CREATED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "queueId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayId" TEXT,
    "accessToken" TEXT NOT NULL,
    "operatorId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "rating" INTEGER,
    "feedbackText" TEXT,
    "purpose" TEXT,
    "formResponses" JSONB,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookiePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "necessary" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "functional" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookiePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "context" JSONB,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseInquiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "authorName" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QueueToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QueueToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ResourceToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResourceToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "CustomerConversation_tenantId_status_idx" ON "CustomerConversation"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerConversation_tenantId_customerPhone_key" ON "CustomerConversation"("tenantId", "customerPhone");

-- CreateIndex
CREATE INDEX "TenantUsage_tenantId_idx" ON "TenantUsage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUsage_tenantId_periodStart_periodEnd_key" ON "TenantUsage"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_key_key" ON "WhatsAppTemplate"("key");

-- CreateIndex
CREATE INDEX "ChatSession_tenantId_idx" ON "ChatSession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_tenantId_phone_key" ON "ChatSession"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "CommunicationLog_workspaceId_idx" ON "CommunicationLog"("workspaceId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE INDEX "Location_workspaceId_idx" ON "Location"("workspaceId");

-- CreateIndex
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE INDEX "Service_locationId_idx" ON "Service"("locationId");

-- CreateIndex
CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");

-- CreateIndex
CREATE INDEX "Staff_locationId_idx" ON "Staff"("locationId");

-- CreateIndex
CREATE INDEX "Staff_userId_idx" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Resource_tenantId_idx" ON "Resource"("tenantId");

-- CreateIndex
CREATE INDEX "Resource_locationId_idx" ON "Resource"("locationId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_idx" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_locationId_idx" ON "Appointment"("locationId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledStart_idx" ON "Appointment"("scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_accessToken_key" ON "Visit"("accessToken");

-- CreateIndex
CREATE INDEX "Visit_tenantId_idx" ON "Visit"("tenantId");

-- CreateIndex
CREATE INDEX "Visit_locationId_idx" ON "Visit"("locationId");

-- CreateIndex
CREATE INDEX "Visit_currentState_idx" ON "Visit"("currentState");

-- CreateIndex
CREATE INDEX "Visit_customerId_idx" ON "Visit"("customerId");

-- CreateIndex
CREATE INDEX "Visit_queueId_idx" ON "Visit"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_type_version_key" ON "Policy"("type", "version");

-- CreateIndex
CREATE INDEX "PolicyAcceptance_userId_idx" ON "PolicyAcceptance"("userId");

-- CreateIndex
CREATE INDEX "PolicyAcceptance_policyId_idx" ON "PolicyAcceptance"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "CookiePreference_anonymousId_key" ON "CookiePreference"("anonymousId");

-- CreateIndex
CREATE INDEX "CookiePreference_userId_idx" ON "CookiePreference"("userId");

-- CreateIndex
CREATE INDEX "CookiePreference_anonymousId_idx" ON "CookiePreference"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_idx" ON "OutboxEvent"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_tenantId_idx" ON "EnterpriseInquiry"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_key" ON "Blog"("slug");

-- CreateIndex
CREATE INDEX "Blog_slug_idx" ON "Blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSubscriber_email_key" ON "MarketingSubscriber"("email");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_email_idx" ON "MarketingSubscriber"("email");

-- CreateIndex
CREATE INDEX "_QueueToService_B_index" ON "_QueueToService"("B");

-- CreateIndex
CREATE INDEX "_ResourceToService_B_index" ON "_ResourceToService"("B");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_customerId_idx" ON "AuditLog"("customerId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Message_visitId_idx" ON "Message"("visitId");

-- CreateIndex
CREATE INDEX "Message_tenantId_customerPhone_idx" ON "Message"("tenantId", "customerPhone");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Queue_tenantId_idx" ON "Queue"("tenantId");

-- CreateIndex
CREATE INDEX "Queue_locationId_idx" ON "Queue"("locationId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_idx" ON "Transaction"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_tenantId_idx" ON "WebhookEndpoint"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_idx" ON "WebhookEvent"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_transactionId_idx" ON "WebhookEvent"("transactionId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_idx" ON "Workspace"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerConversation" ADD CONSTRAINT "CustomerConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CustomerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUsage" ADD CONSTRAINT "TenantUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_assignedResourceId_fkey" FOREIGN KEY ("assignedResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookiePreference" ADD CONSTRAINT "CookiePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseInquiry" ADD CONSTRAINT "EnterpriseInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueueToService" ADD CONSTRAINT "_QueueToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueueToService" ADD CONSTRAINT "_QueueToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceToService" ADD CONSTRAINT "_ResourceToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceToService" ADD CONSTRAINT "_ResourceToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

