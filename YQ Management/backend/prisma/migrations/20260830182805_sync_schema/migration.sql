/*
  Warnings:

  - You are about to drop the column `cancellationReason` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `isPaused` on the `Queue` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Queue` table. All the data in the column will be lost.
  - You are about to drop the column `actualWaitMins` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `checkInCode` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedWaitMins` on the `Visit` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'BLOCKED';

-- DropIndex
DROP INDEX "Invitation_workspaceId_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "cancellationReason",
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "action" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "customerPhone" DROP DEFAULT,
ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "isPaused",
DROP COLUMN "rules",
ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "businessHoursOverride" JSONB,
ADD COLUMN     "exceptionDatesOverride" JSONB,
ADD COLUMN     "useLocationHours" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Visit" DROP COLUMN "actualWaitMins",
DROP COLUMN "checkInCode",
DROP COLUMN "estimatedWaitMins";

-- AlterTable
ALTER TABLE "WebhookEndpoint" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WebhookEvent" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "ownerId" DROP DEFAULT,
ALTER COLUMN "tenantId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Invitation_code_idx" ON "Invitation"("code");
