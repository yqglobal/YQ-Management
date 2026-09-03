-- CreateTable: GoogleIntegration
-- This table stores Google OAuth tokens linked to a Tenant, allowing multiple Google accounts
CREATE TABLE IF NOT EXISTS "GoogleIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleIntegration_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Location - add Google integration fields
ALTER TABLE "Location"
    ADD COLUMN IF NOT EXISTS "googleIntegrationId" TEXT,
    ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT,
    ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;

-- CreateIndex (safe)
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleIntegration_tenantId_email_key" ON "GoogleIntegration"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "GoogleIntegration_tenantId_idx" ON "GoogleIntegration"("tenantId");
CREATE INDEX IF NOT EXISTS "Location_googleIntegrationId_idx" ON "Location"("googleIntegrationId");

-- AddForeignKey: GoogleIntegration -> Tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'GoogleIntegration_tenantId_fkey'
          AND table_name = 'GoogleIntegration'
    ) THEN
        ALTER TABLE "GoogleIntegration" ADD CONSTRAINT "GoogleIntegration_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Location -> GoogleIntegration
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Location_googleIntegrationId_fkey'
          AND table_name = 'Location'
    ) THEN
        ALTER TABLE "Location" ADD CONSTRAINT "Location_googleIntegrationId_fkey"
            FOREIGN KEY ("googleIntegrationId") REFERENCES "GoogleIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
