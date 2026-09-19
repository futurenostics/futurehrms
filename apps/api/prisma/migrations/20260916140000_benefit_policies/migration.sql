-- Company benefit policies + per-employee period wallets + idempotent ledger.

CREATE TABLE "BenefitPolicy" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "amountPkr" DECIMAL(14,2) NOT NULL,
    "opticalSubCapPkr" DECIMAL(14,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BenefitPolicy_kind_status_idx" ON "BenefitPolicy"("kind", "status");

ALTER TABLE "BenefitPolicy" ADD CONSTRAINT "BenefitPolicy_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmployeeBenefitBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "allocatedPkr" DECIMAL(14,2) NOT NULL,
    "usedPkr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usedOpticalPkr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "policyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBenefitBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeBenefitBalance_employeeId_kind_periodKey_key" ON "EmployeeBenefitBalance"("employeeId", "kind", "periodKey");
CREATE INDEX "EmployeeBenefitBalance_kind_periodKey_idx" ON "EmployeeBenefitBalance"("kind", "periodKey");

ALTER TABLE "EmployeeBenefitBalance" ADD CONSTRAINT "EmployeeBenefitBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeBenefitBalance" ADD CONSTRAINT "EmployeeBenefitBalance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "BenefitPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BenefitLedgerEntry" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amountPkr" DECIMAL(14,2) NOT NULL,
    "isOptical" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BenefitLedgerEntry_claimId_key" ON "BenefitLedgerEntry"("claimId");
CREATE INDEX "BenefitLedgerEntry_employeeId_kind_periodKey_idx" ON "BenefitLedgerEntry"("employeeId", "kind", "periodKey");
