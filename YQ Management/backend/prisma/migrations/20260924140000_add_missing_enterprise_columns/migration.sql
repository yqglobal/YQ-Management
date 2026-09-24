-- AlterTable
ALTER TABLE "Service" DROP COLUMN IF EXISTS "requiredSkills",
ADD COLUMN IF NOT EXISTS "emaExpectedDuration" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "slaPolicyId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "slaStatus" TEXT NOT NULL DEFAULT 'OK',
ADD COLUMN IF NOT EXISTS "surveySent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "WebhookEndpoint" ALTER COLUMN "payloadFormat" SET DEFAULT 'DEFAULT';

-- CreateTable
CREATE TABLE IF NOT EXISTS "SlaPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warningThresholdMins" INTEGER NOT NULL,
    "breachThresholdMins" INTEGER NOT NULL,
    "escalationPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlaPolicy" DROP CONSTRAINT IF EXISTS "SlaPolicy_tenantId_fkey";
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_slaPolicyId_fkey";
ALTER TABLE "Service" ADD CONSTRAINT "Service_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "SlaPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
