-- Phase 2: Add OperatingMode enum and setupComplete/operatingMode to Tenant
-- This migration safely adds new columns with defaults so no data is lost.

-- 1. Create the OperatingMode enum
CREATE TYPE "OperatingMode" AS ENUM ('QUEUE_ONLY', 'APPOINTMENTS', 'JOURNEY');

-- 2. Add setupComplete column (replaces brittle ghost-tenant heuristic)
ALTER TABLE "Tenant" ADD COLUMN "setupComplete" BOOLEAN NOT NULL DEFAULT false;

-- 3. Add operatingMode column (tracks which UX mode the tenant chose during onboarding)
ALTER TABLE "Tenant" ADD COLUMN "operatingMode" "OperatingMode" NOT NULL DEFAULT 'QUEUE_ONLY';
