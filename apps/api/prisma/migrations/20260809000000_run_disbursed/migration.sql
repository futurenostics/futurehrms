-- Module 4 disbursement: post-lock "Disburse to portals" action stamps
-- who/when a locked run was pushed out to the payout portals. Additive
-- nullable columns.
ALTER TABLE "CommissionRun" ADD COLUMN "disbursedAt" TIMESTAMP(3);
ALTER TABLE "CommissionRun" ADD COLUMN "disbursedById" TEXT;
