-- Module 4 processing: leave-days deduction inputs + mandatory hold
-- reason on commission line items. Additive nullable columns.
ALTER TABLE "CommissionLineItem" ADD COLUMN "workingDaysInMonth" INTEGER;
ALTER TABLE "CommissionLineItem" ADD COLUMN "leaveDays" INTEGER;
ALTER TABLE "CommissionLineItem" ADD COLUMN "holdReason" TEXT;
