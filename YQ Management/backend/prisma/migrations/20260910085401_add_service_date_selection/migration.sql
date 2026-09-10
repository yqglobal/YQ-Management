-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "dateSelectionType" TEXT NOT NULL DEFAULT 'calendar',
ADD COLUMN     "maxDaysInAdvance" INTEGER NOT NULL DEFAULT 30;
