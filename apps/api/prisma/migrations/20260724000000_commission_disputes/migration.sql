-- CreateTable: commission dispute / query flow.
-- An employee flags a specific line item; HR resolves with a status +
-- note. lineItemId is SetNull on delete so disputes survive a run
-- recalculate; run/employee/project/role/amount are denormalised.
CREATE TABLE "CommissionDispute" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "roleName" TEXT,
    "disputedAmountUsd" DECIMAL(12,2),
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionDispute_runId_idx" ON "CommissionDispute"("runId");
CREATE INDEX "CommissionDispute_employeeId_idx" ON "CommissionDispute"("employeeId");
CREATE INDEX "CommissionDispute_status_idx" ON "CommissionDispute"("status");
CREATE INDEX "CommissionDispute_lineItemId_idx" ON "CommissionDispute"("lineItemId");

-- AddForeignKey
ALTER TABLE "CommissionDispute" ADD CONSTRAINT "CommissionDispute_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "CommissionLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionDispute" ADD CONSTRAINT "CommissionDispute_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
