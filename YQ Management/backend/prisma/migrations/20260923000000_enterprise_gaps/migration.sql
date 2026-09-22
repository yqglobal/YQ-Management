-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterEnum
ALTER TYPE "QueueStatus" ADD VALUE 'PAUSED_FOR_EMERGENCY';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "accompanyingGuests" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "requiredSkills" TEXT[];

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "skills" TEXT[];

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "businessType" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "strictPrivacyMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN "accompanyingGuests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "itinerary" JSONB,
ADD COLUMN "tags" TEXT[];

-- AlterTable
ALTER TABLE "WebhookEndpoint" ADD COLUMN "payloadFormat" TEXT NOT NULL DEFAULT 'JSON';
