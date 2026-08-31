-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "frozenByQuota" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "frozenByQuota" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "frozenByQuota" BOOLEAN NOT NULL DEFAULT false;
