-- AlterTable
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];
