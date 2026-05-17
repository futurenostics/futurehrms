-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "commissionRate" TEXT,
ADD COLUMN     "eligibleForCommissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "employmentRecord" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "lastWorkingDay" TIMESTAMP(3),
ADD COLUMN     "noticePeriodStart" TIMESTAMP(3),
ADD COLUMN     "payoneerEmail" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "salaryEffectiveDate" TIMESTAMP(3),
ADD COLUMN     "systemRoleSlug" TEXT,
ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "terminationNotes" TEXT,
ADD COLUMN     "terminationReason" TEXT;

-- Backfill firstName / lastName from existing fullName so the new
-- sheet has data to display for pre-migration employees. Splits on
-- the first space; everything after = lastName. Single-word names
-- get the same value mirrored to both columns so the sheet never
-- shows an empty Last name field.
UPDATE "Employee"
SET
  "firstName" = CASE
    WHEN POSITION(' ' IN "fullName") > 0 THEN SUBSTRING("fullName" FROM 1 FOR POSITION(' ' IN "fullName") - 1)
    ELSE "fullName"
  END,
  "lastName" = CASE
    WHEN POSITION(' ' IN "fullName") > 0 THEN SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)
    ELSE "fullName"
  END
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Default systemRoleSlug to 'employee' for existing rows so the
-- Access & Role section has a meaningful default to render.
UPDATE "Employee" SET "systemRoleSlug" = 'employee' WHERE "systemRoleSlug" IS NULL;
