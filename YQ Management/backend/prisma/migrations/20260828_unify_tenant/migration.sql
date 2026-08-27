-- =============================================================================
-- Migration: 20260828_unify_tenant
-- Purpose: Unify the platform on Tenant as the single root entity.
--          Migrates Invitation from workspaceId to tenantId scope.
--          Makes Queue.workspaceId optional (tenantId is the FK).
-- =============================================================================

-- Step 1: Add tenantId to Invitation (backfill from Workspace relation)
ALTER TABLE IF EXISTS "Invitation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

UPDATE "Invitation" i
SET "tenantId" = w."tenantId"
FROM "Workspace" w
WHERE w.id = i."workspaceId"
  AND i."tenantId" IS NULL;

-- Fallback for orphaned invitations
UPDATE "Invitation" i
SET "tenantId" = (SELECT t.id FROM "Tenant" t ORDER BY t."createdAt" ASC LIMIT 1)
WHERE i."tenantId" IS NULL;

-- Enforce NOT NULL
ALTER TABLE IF EXISTS "Invitation" ALTER COLUMN "tenantId" SET NOT NULL;

-- Step 2: Add FK from Invitation to Tenant
DO $$ BEGIN
  ALTER TABLE IF EXISTS "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Drop hard FK from Invitation to Workspace (keep column nullable)
ALTER TABLE IF EXISTS "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_workspaceId_fkey";
ALTER TABLE IF EXISTS "Invitation" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- Step 4: Index on Invitation.tenantId
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Invitation_tenantId_idx" ON "Invitation"("tenantId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Make Queue.workspaceId optional
ALTER TABLE IF EXISTS "Queue" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- Step 6: Drop hard FK from Queue to Workspace
ALTER TABLE IF EXISTS "Queue" DROP CONSTRAINT IF EXISTS "Queue_workspaceId_fkey";

-- Step 7: Add Queue.locationId for multi-location routing
ALTER TABLE IF EXISTS "Queue" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

DO $$ BEGIN
  ALTER TABLE IF EXISTS "Queue" ADD CONSTRAINT "Queue_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Queue_locationId_idx" ON "Queue"("locationId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 8: Ensure User.workspaceId is nullable
ALTER TABLE IF EXISTS "User" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- Step 9: Ensure tenantId index on User
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
