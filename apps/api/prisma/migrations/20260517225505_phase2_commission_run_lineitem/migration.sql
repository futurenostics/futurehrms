-- AlterTable
ALTER TABLE "CommissionRule" ADD COLUMN     "minProjectRevenueUsd" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommissionRun" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "fxRateUsdToPkr" DECIMAL(14,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approverIsSubmitter" BOOLEAN NOT NULL DEFAULT false,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "approvalConfirmationPhrase" TEXT,
    "notes" TEXT,

    CONSTRAINT "CommissionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLineItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "snapshotPercentage" DECIMAL(5,2) NOT NULL,
    "baseRevenueUsd" DECIMAL(12,2) NOT NULL,
    "monthFractionNumerator" INTEGER NOT NULL,
    "monthFractionDenominator" INTEGER NOT NULL,
    "calculatedAmountUsd" DECIMAL(12,2) NOT NULL,
    "leaveAdjustmentUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "manualAdjustmentUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "manualAdjustmentNote" TEXT,
    "isHeld" BOOLEAN NOT NULL DEFAULT false,
    "carryForwardToRunId" TEXT,
    "carryForwardFromRunId" TEXT,
    "finalAmountUsd" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRun_status_idx" ON "CommissionRun"("status");

-- CreateIndex
CREATE INDEX "CommissionRun_monthKey_idx" ON "CommissionRun"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRun_monthKey_key" ON "CommissionRun"("monthKey");

-- CreateIndex
CREATE INDEX "CommissionLineItem_runId_idx" ON "CommissionLineItem"("runId");

-- CreateIndex
CREATE INDEX "CommissionLineItem_projectId_idx" ON "CommissionLineItem"("projectId");

-- CreateIndex
CREATE INDEX "CommissionLineItem_employeeId_idx" ON "CommissionLineItem"("employeeId");

-- CreateIndex
CREATE INDEX "CommissionLineItem_carryForwardToRunId_idx" ON "CommissionLineItem"("carryForwardToRunId");

-- CreateIndex
CREATE INDEX "CommissionLineItem_carryForwardFromRunId_idx" ON "CommissionLineItem"("carryForwardFromRunId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLineItem_runId_projectId_employeeId_roleName_key" ON "CommissionLineItem"("runId", "projectId", "employeeId", "roleName");

-- AddForeignKey
ALTER TABLE "CommissionLineItem" ADD CONSTRAINT "CommissionLineItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommissionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLineItem" ADD CONSTRAINT "CommissionLineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLineItem" ADD CONSTRAINT "CommissionLineItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
