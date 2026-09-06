-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_tenantId_fkey";

-- DropIndex
DROP INDEX "CommunicationLog_workspaceId_idx";

-- DropIndex
DROP INDEX "Location_workspaceId_idx";

-- DropIndex
DROP INDEX "Transaction_workspaceId_idx";

-- DropIndex
DROP INDEX "User_workspaceId_idx";

-- DropIndex
DROP INDEX "WebhookEvent_workspaceId_idx";

-- AlterTable
ALTER TABLE "CommunicationLog" DROP COLUMN "workspaceId",
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "allowProviderSelection" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "exceptionDates" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "weeklySchedule" JSONB;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleBusinessConnected",
DROP COLUMN "googleLocationId",
DROP COLUMN "googlePlaceId",
DROP COLUMN "googleRefreshToken",
DROP COLUMN "googleReviewLink",
DROP COLUMN "googleTokenExpiry",
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "workspaceId";

-- AlterTable
ALTER TABLE "WhatsAppTemplate" DROP COLUMN "workspaceId",
ADD COLUMN     "tenantId" TEXT;

-- DropTable
DROP TABLE "Workspace";

-- CreateTable
CREATE TABLE "_StaffToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StaffToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StaffToService_B_index" ON "_StaffToService"("B");

-- CreateIndex
CREATE INDEX "CommunicationLog_tenantId_idx" ON "CommunicationLog"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_idx" ON "WhatsAppTemplate"("tenantId");

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffToService" ADD CONSTRAINT "_StaffToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffToService" ADD CONSTRAINT "_StaffToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

