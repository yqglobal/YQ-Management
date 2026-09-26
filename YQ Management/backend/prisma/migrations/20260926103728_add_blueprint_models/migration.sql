-- CreateTable
CREATE TABLE "BlueprintFlow" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintStep" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "StepType" NOT NULL DEFAULT 'SERVICE',
    "trigger" "StepTrigger" NOT NULL DEFAULT 'MANUAL_STAFF',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "requiresQrScan" BOOLEAN NOT NULL DEFAULT true,
    "requiresStaffAction" BOOLEAN NOT NULL DEFAULT true,
    "deferredByDays" INTEGER,
    "deferredByHours" INTEGER,
    "entitlementUnit" TEXT,
    "entitlementFixed" INTEGER,
    "entitlementFormula" TEXT,
    "allowPartialRedemption" BOOLEAN NOT NULL DEFAULT false,
    "preventDoubleRedemption" BOOLEAN NOT NULL DEFAULT true,
    "customerInstruction" TEXT,
    "staffInstruction" TEXT,
    "locationDescription" TEXT,
    "notifyCustomerOnActivation" BOOLEAN NOT NULL DEFAULT true,
    "outcomeOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stepPrice" DOUBLE PRECISION,
    "isPriceVariable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BlueprintStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintFlow_key_key" ON "BlueprintFlow"("key");

-- CreateIndex
CREATE INDEX "BlueprintFlow_tenantId_idx" ON "BlueprintFlow"("tenantId");

-- CreateIndex
CREATE INDEX "BlueprintStep_blueprintId_idx" ON "BlueprintStep"("blueprintId");

-- AddForeignKey
ALTER TABLE "BlueprintFlow" ADD CONSTRAINT "BlueprintFlow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintStep" ADD CONSTRAINT "BlueprintStep_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "BlueprintFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
