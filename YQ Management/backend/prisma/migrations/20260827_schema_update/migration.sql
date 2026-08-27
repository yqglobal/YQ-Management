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
ALTER TABLE IF EXISTS "PaymentProvider" ALTER COLUMN "name" TYPE "PaymentProviderName_new" USING ("name"::text::"PaymentProviderName_new");
ALTER TYPE "PaymentProviderName" RENAME TO "PaymentProviderName_old";
ALTER TYPE "PaymentProviderName_new" RENAME TO "PaymentProviderName";
DROP TYPE IF EXISTS "public"."PaymentProviderName_old" CASCADE;
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TENANT_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT', 'PAST_DUE');
ALTER TABLE IF EXISTS "public"."Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE IF EXISTS "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE IF EXISTS "public"."SubscriptionStatus_old" CASCADE;
ALTER TABLE IF EXISTS "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WebhookEventType_new" AS ENUM ('PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_PENDING');
ALTER TABLE IF EXISTS "WebhookEvent" ALTER COLUMN "eventType" TYPE "WebhookEventType_new" USING ("eventType"::text::"WebhookEventType_new");
ALTER TYPE "WebhookEventType" RENAME TO "WebhookEventType_old";
ALTER TYPE "WebhookEventType_new" RENAME TO "WebhookEventType";
DROP TYPE IF EXISTS "public"."WebhookEventType_old" CASCADE;
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WebhookProcessingStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');
ALTER TABLE IF EXISTS "public"."WebhookEvent" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE IF EXISTS "WebhookEvent" ALTER COLUMN "processingStatus" TYPE "WebhookProcessingStatus_new" USING ("processingStatus"::text::"WebhookProcessingStatus_new");
ALTER TYPE "WebhookProcessingStatus" RENAME TO "WebhookProcessingStatus_old";
ALTER TYPE "WebhookProcessingStatus_new" RENAME TO "WebhookProcessingStatus";
DROP TYPE IF EXISTS "public"."WebhookProcessingStatus_old" CASCADE;
ALTER TABLE IF EXISTS "WebhookEvent" ALTER COLUMN "processingStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE IF EXISTS "Message" DROP CONSTRAINT IF EXISTS "Message_tokenId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "PersonalSettings" DROP CONSTRAINT IF EXISTS "PersonalSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "WebhookEndpoint" DROP CONSTRAINT IF EXISTS "WebhookEndpoint_workspaceId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_workspaceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Invoice_invoiceNumber_idx";

-- DropIndex
DROP INDEX IF EXISTS "Invoice_workspaceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Message_tokenId_idx";

-- DropIndex
DROP INDEX IF EXISTS "PaymentProvider_name_key";

-- DropIndex
DROP INDEX IF EXISTS "Queue_workspaceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Subscription_planId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Subscription_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "Subscription_workspaceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Subscription_workspaceId_key";

-- DropIndex
DROP INDEX IF EXISTS "WebhookEndpoint_workspaceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "WebhookEvent_idempotencyKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "WebhookEvent_processingStatus_idx";

-- DropIndex
DROP INDEX IF EXISTS "WebhookEvent_providerEventId_idx";

-- DropIndex
DROP INDEX IF EXISTS "WebhookEvent_providerEventId_provider_key";

-- AlterTable
ALTER TABLE IF EXISTS "AuditLog" DROP COLUMN IF EXISTS "entity",
DROP COLUMN IF EXISTS "workspaceId",
ADD COLUMN IF NOT EXISTS "customerId" TEXT,
ADD COLUMN IF NOT EXISTS "durationMs" INTEGER,
ADD COLUMN IF NOT EXISTS "endpoint" TEXT,
ADD COLUMN IF NOT EXISTS "method" TEXT,
ADD COLUMN IF NOT EXISTS "resource" TEXT,
ADD COLUMN IF NOT EXISTS "resourceId" TEXT,
ADD COLUMN IF NOT EXISTS "statusCode" INTEGER,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
DROP COLUMN IF EXISTS "action",
ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "Invitation" DROP COLUMN IF EXISTS "createdBy",
DROP COLUMN IF EXISTS "revoked",
ADD COLUMN IF NOT EXISTS "allowedLocationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "allowedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3),
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "maxUses" SET DEFAULT 1,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "Invoice" DROP COLUMN IF EXISTS "invoiceNumber",
DROP COLUMN IF EXISTS "metadata",
DROP COLUMN IF EXISTS "subscriptionId",
DROP COLUMN IF EXISTS "transactionId",
DROP COLUMN IF EXISTS "workspaceId",
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "Message" DROP COLUMN IF EXISTS "tokenId",
ADD COLUMN IF NOT EXISTS "conversationId" TEXT,
ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "visitId" TEXT;

-- AlterTable
ALTER TABLE IF EXISTS "PaymentProvider" DROP COLUMN IF EXISTS "apiKey",
DROP COLUMN IF EXISTS "isActive",
DROP COLUMN IF EXISTS "webhookSecret",
ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE IF EXISTS "Plan" DROP COLUMN IF EXISTS "status",
ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "interval" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS "maxQueues" INTEGER,
ADD COLUMN IF NOT EXISTS "maxVisits" INTEGER,
DROP COLUMN IF EXISTS "type",
ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'standard',
DROP COLUMN IF EXISTS "billingInterval",
ADD COLUMN IF NOT EXISTS "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
ALTER COLUMN "price" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "Queue" DROP COLUMN IF EXISTS "allowAppointments",
DROP COLUMN IF EXISTS "appointmentGranularityMins",
DROP COLUMN IF EXISTS "requireManualCheckIn",
ADD COLUMN IF NOT EXISTS "locationId" TEXT,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "tokenDisplayConfig" JSONB,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "Subscription" DROP COLUMN IF EXISTS "startedAt",
DROP COLUMN IF EXISTS "trialDays",
DROP COLUMN IF EXISTS "workspaceId",
ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "ozowSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,
DROP COLUMN IF EXISTS "billingInterval",
ADD COLUMN IF NOT EXISTS "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
ALTER COLUMN "currentPeriodStart" SET NOT NULL,
ALTER COLUMN "currentPeriodStart" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "currentPeriodEnd" SET NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "Token" ADD COLUMN IF NOT EXISTS "displayId" TEXT,
ADD COLUMN IF NOT EXISTS "operatorId" TEXT,
ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE IF EXISTS "Transaction" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT,
ADD COLUMN IF NOT EXISTS "planId" TEXT,
ADD COLUMN IF NOT EXISTS "rawProviderResponse" JSONB,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "status",
ADD COLUMN IF NOT EXISTS "allowedLocationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "allowedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "personalSettings" JSONB,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "WebhookEndpoint" DROP COLUMN IF EXISTS "workspaceId",
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE IF EXISTS "WebhookEvent" DROP COLUMN IF EXISTS "amountValid",
DROP COLUMN IF EXISTS "currencyValid",
DROP COLUMN IF EXISTS "idempotencyKey",
DROP COLUMN IF EXISTS "paymentRefValid",
DROP COLUMN IF EXISTS "providerEventId",
DROP COLUMN IF EXISTS "retryCount",
DROP COLUMN IF EXISTS "signature",
DROP COLUMN IF EXISTS "subscriptionId",
DROP COLUMN IF EXISTS "subscriptionValid",
DROP COLUMN IF EXISTS "transactionValid",
DROP COLUMN IF EXISTS "updatedAt",
DROP COLUMN IF EXISTS "workspaceValid",
ADD COLUMN IF NOT EXISTS "error" TEXT,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,
DROP COLUMN IF EXISTS "provider",
ADD COLUMN IF NOT EXISTS "provider" TEXT,
ALTER COLUMN "signatureValid" DROP NOT NULL,
ALTER COLUMN "signatureValid" DROP DEFAULT,
DROP COLUMN IF EXISTS "processingResult",
ADD COLUMN IF NOT EXISTS "processingResult" JSONB;

-- AlterTable
ALTER TABLE IF EXISTS "Workspace" DROP COLUMN IF EXISTS "chatbotConfig",
DROP COLUMN IF EXISTS "chatbotEnabled",
DROP COLUMN IF EXISTS "subscriptionStatus",
DROP COLUMN IF EXISTS "whatsappConnected",
DROP COLUMN IF EXISTS "whatsappInstanceId",
DROP COLUMN IF EXISTS "whatsappPhone",
ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;

-- DropTable
DROP TABLE IF EXISTS "BillingSettings";

-- DropTable
DROP TABLE IF EXISTS "PaymentMethod";

-- DropTable
DROP TABLE IF EXISTS "PersonalSettings";

-- DropTable
DROP TABLE IF EXISTS "RefreshToken";

-- DropTable
DROP TABLE IF EXISTS "WorkspaceUsage";

-- DropEnum
DROP TYPE IF EXISTS "AuditAction";

-- DropEnum
DROP TYPE IF EXISTS "BillingInterval";

-- DropEnum
DROP TYPE IF EXISTS "PlanStatus";

-- DropEnum
DROP TYPE IF EXISTS "PlanType";

-- DropEnum
DROP TYPE IF EXISTS "TransactionStatus";

-- DropEnum
DROP TYPE IF EXISTS "UserStatus";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
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
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerConversation" (
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
CREATE TABLE IF NOT EXISTS "TenantUsage" (
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
CREATE TABLE IF NOT EXISTS "WhatsAppTemplate" (
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
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommunicationLog" (
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
CREATE TABLE IF NOT EXISTS "Customer" (
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
CREATE TABLE IF NOT EXISTS "Location" (
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
CREATE TABLE IF NOT EXISTS "Service" (
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
CREATE TABLE IF NOT EXISTS "Staff" (
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
CREATE TABLE IF NOT EXISTS "Resource" (
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
CREATE TABLE IF NOT EXISTS "Appointment" (
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
CREATE TABLE IF NOT EXISTS "Visit" (
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
CREATE TABLE IF NOT EXISTS "Policy" (
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
CREATE TABLE IF NOT EXISTS "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CookiePreference" (
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
CREATE TABLE IF NOT EXISTS "UserSession" (
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
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
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
CREATE TABLE IF NOT EXISTS "SystemLog" (
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
CREATE TABLE IF NOT EXISTS "EnterpriseInquiry" (
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
CREATE TABLE IF NOT EXISTS "Blog" (
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
CREATE TABLE IF NOT EXISTS "MarketingSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_QueueToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QueueToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_ResourceToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResourceToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerConversation_tenantId_status_idx" ON "CustomerConversation"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerConversation_tenantId_customerPhone_key" ON "CustomerConversation"("tenantId", "customerPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantUsage_tenantId_idx" ON "TenantUsage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TenantUsage_tenantId_periodStart_periodEnd_key" ON "TenantUsage"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_key_key" ON "WhatsAppTemplate"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatSession_tenantId_idx" ON "ChatSession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChatSession_tenantId_phone_key" ON "ChatSession"("tenantId", "phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CommunicationLog_workspaceId_idx" ON "CommunicationLog"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Location_workspaceId_idx" ON "Location"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Service_locationId_idx" ON "Service"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Staff_tenantId_idx" ON "Staff"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Staff_locationId_idx" ON "Staff"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Staff_userId_idx" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_tenantId_idx" ON "Resource"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_locationId_idx" ON "Resource"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_idx" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_locationId_idx" ON "Appointment"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_scheduledStart_idx" ON "Appointment"("scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Visit_accessToken_key" ON "Visit"("accessToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visit_tenantId_idx" ON "Visit"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visit_locationId_idx" ON "Visit"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visit_currentState_idx" ON "Visit"("currentState");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visit_customerId_idx" ON "Visit"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visit_queueId_idx" ON "Visit"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Policy_type_version_key" ON "Policy"("type", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_userId_idx" ON "PolicyAcceptance"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_policyId_idx" ON "PolicyAcceptance"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CookiePreference_anonymousId_key" ON "CookiePreference"("anonymousId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CookiePreference_userId_idx" ON "CookiePreference"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CookiePreference_anonymousId_idx" ON "CookiePreference"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_idx" ON "OutboxEvent"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EnterpriseInquiry_tenantId_idx" ON "EnterpriseInquiry"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Blog_slug_key" ON "Blog"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Blog_slug_idx" ON "Blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSubscriber_email_key" ON "MarketingSubscriber"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingSubscriber_email_idx" ON "MarketingSubscriber"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_QueueToService_B_index" ON "_QueueToService"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_ResourceToService_B_index" ON "_ResourceToService"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_customerId_idx" ON "AuditLog"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_visitId_idx" ON "Message"("visitId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_tenantId_customerPhone_idx" ON "Message"("tenantId", "customerPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Queue_tenantId_idx" ON "Queue"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Queue_locationId_idx" ON "Queue"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_tenantId_idx" ON "Transaction"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_tenantId_idx" ON "WebhookEndpoint"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_tenantId_idx" ON "WebhookEvent"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_transactionId_idx" ON "WebhookEvent"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Workspace_tenantId_idx" ON "Workspace"("tenantId");

-- AddForeignKey
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_tenantId_fkey";
ALTER TABLE IF EXISTS "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey";
ALTER TABLE IF EXISTS "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Queue" DROP CONSTRAINT IF EXISTS "Queue_tenantId_fkey";
ALTER TABLE IF EXISTS "Queue" ADD CONSTRAINT "Queue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Queue" DROP CONSTRAINT IF EXISTS "Queue_locationId_fkey";
ALTER TABLE IF EXISTS "Queue" ADD CONSTRAINT "Queue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Token" DROP CONSTRAINT IF EXISTS "Token_operatorId_fkey";
ALTER TABLE IF EXISTS "Token" ADD CONSTRAINT "Token_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "CustomerConversation" DROP CONSTRAINT IF EXISTS "CustomerConversation_tenantId_fkey";
ALTER TABLE IF EXISTS "CustomerConversation" ADD CONSTRAINT "CustomerConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Message" DROP CONSTRAINT IF EXISTS "Message_tenantId_fkey";
ALTER TABLE IF EXISTS "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Message" DROP CONSTRAINT IF EXISTS "Message_visitId_fkey";
ALTER TABLE IF EXISTS "Message" ADD CONSTRAINT "Message_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Message" DROP CONSTRAINT IF EXISTS "Message_conversationId_fkey";
ALTER TABLE IF EXISTS "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CustomerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_tenantId_fkey";
ALTER TABLE IF EXISTS "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "WebhookEndpoint" DROP CONSTRAINT IF EXISTS "WebhookEndpoint_tenantId_fkey";
ALTER TABLE IF EXISTS "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Workspace" DROP CONSTRAINT IF EXISTS "Workspace_tenantId_fkey";
ALTER TABLE IF EXISTS "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_tenantId_fkey";
ALTER TABLE IF EXISTS "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_planId_fkey";
ALTER TABLE IF EXISTS "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_tenantId_fkey";
ALTER TABLE IF EXISTS "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "TenantUsage" DROP CONSTRAINT IF EXISTS "TenantUsage_tenantId_fkey";
ALTER TABLE IF EXISTS "TenantUsage" ADD CONSTRAINT "TenantUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "ChatSession" DROP CONSTRAINT IF EXISTS "ChatSession_tenantId_fkey";
ALTER TABLE IF EXISTS "ChatSession" ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "CommunicationLog" DROP CONSTRAINT IF EXISTS "CommunicationLog_workspaceId_fkey";
ALTER TABLE IF EXISTS "CommunicationLog" ADD CONSTRAINT "CommunicationLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "WebhookEvent" DROP CONSTRAINT IF EXISTS "WebhookEvent_tenantId_fkey";
ALTER TABLE IF EXISTS "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "WebhookEvent" DROP CONSTRAINT IF EXISTS "WebhookEvent_workspaceId_fkey";
ALTER TABLE IF EXISTS "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Customer" DROP CONSTRAINT IF EXISTS "Customer_tenantId_fkey";
ALTER TABLE IF EXISTS "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Location" DROP CONSTRAINT IF EXISTS "Location_tenantId_fkey";
ALTER TABLE IF EXISTS "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Location" DROP CONSTRAINT IF EXISTS "Location_workspaceId_fkey";
ALTER TABLE IF EXISTS "Location" ADD CONSTRAINT "Location_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Service" DROP CONSTRAINT IF EXISTS "Service_tenantId_fkey";
ALTER TABLE IF EXISTS "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Service" DROP CONSTRAINT IF EXISTS "Service_locationId_fkey";
ALTER TABLE IF EXISTS "Service" ADD CONSTRAINT "Service_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Staff" DROP CONSTRAINT IF EXISTS "Staff_tenantId_fkey";
ALTER TABLE IF EXISTS "Staff" ADD CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Staff" DROP CONSTRAINT IF EXISTS "Staff_locationId_fkey";
ALTER TABLE IF EXISTS "Staff" ADD CONSTRAINT "Staff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Resource" DROP CONSTRAINT IF EXISTS "Resource_tenantId_fkey";
ALTER TABLE IF EXISTS "Resource" ADD CONSTRAINT "Resource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Resource" DROP CONSTRAINT IF EXISTS "Resource_locationId_fkey";
ALTER TABLE IF EXISTS "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_tenantId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_customerId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_locationId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_serviceId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_staffId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_resourceId_fkey";
ALTER TABLE IF EXISTS "Appointment" ADD CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_operatorId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_tenantId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_customerId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_locationId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_serviceId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_appointmentId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_assignedStaffId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_assignedResourceId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_assignedResourceId_fkey" FOREIGN KEY ("assignedResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Visit" DROP CONSTRAINT IF EXISTS "Visit_queueId_fkey";
ALTER TABLE IF EXISTS "Visit" ADD CONSTRAINT "Visit_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "PolicyAcceptance" DROP CONSTRAINT IF EXISTS "PolicyAcceptance_userId_fkey";
ALTER TABLE IF EXISTS "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "PolicyAcceptance" DROP CONSTRAINT IF EXISTS "PolicyAcceptance_policyId_fkey";
ALTER TABLE IF EXISTS "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "CookiePreference" DROP CONSTRAINT IF EXISTS "CookiePreference_userId_fkey";
ALTER TABLE IF EXISTS "CookiePreference" ADD CONSTRAINT "CookiePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "UserSession" DROP CONSTRAINT IF EXISTS "UserSession_userId_fkey";
ALTER TABLE IF EXISTS "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "EnterpriseInquiry" DROP CONSTRAINT IF EXISTS "EnterpriseInquiry_tenantId_fkey";
ALTER TABLE IF EXISTS "EnterpriseInquiry" ADD CONSTRAINT "EnterpriseInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "_QueueToService" DROP CONSTRAINT IF EXISTS "_QueueToService_A_fkey";
ALTER TABLE IF EXISTS "_QueueToService" ADD CONSTRAINT "_QueueToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "_QueueToService" DROP CONSTRAINT IF EXISTS "_QueueToService_B_fkey";
ALTER TABLE IF EXISTS "_QueueToService" ADD CONSTRAINT "_QueueToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "_ResourceToService" DROP CONSTRAINT IF EXISTS "_ResourceToService_A_fkey";
ALTER TABLE IF EXISTS "_ResourceToService" ADD CONSTRAINT "_ResourceToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "_ResourceToService" DROP CONSTRAINT IF EXISTS "_ResourceToService_B_fkey";
ALTER TABLE IF EXISTS "_ResourceToService" ADD CONSTRAINT "_ResourceToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

