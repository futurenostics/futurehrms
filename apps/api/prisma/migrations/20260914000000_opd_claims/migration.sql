-- OPD medical reimbursement claims. Prescription files live in the
-- documents bucket; this table stores the object key + claim amounts.
CREATE TABLE "OpdClaim" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "medicineCostPkr" DECIMAL(14,2) NOT NULL,
    "claimedAmountPkr" DECIMAL(14,2) NOT NULL,
    "visitDate" TIMESTAMP(3),
    "notes" TEXT,
    "prescriptionStorageKey" TEXT,
    "prescriptionFileName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpdClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpdClaim_employeeId_status_idx" ON "OpdClaim"("employeeId", "status");
CREATE INDEX "OpdClaim_status_submittedAt_idx" ON "OpdClaim"("status", "submittedAt");

ALTER TABLE "OpdClaim" ADD CONSTRAINT "OpdClaim_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
