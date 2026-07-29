-- Commission clawbacks: mark reversal line items generated when a
-- project is refunded. Additive, non-null with a default so existing
-- rows backfill to false.
ALTER TABLE "CommissionLineItem" ADD COLUMN "isClawback" BOOLEAN NOT NULL DEFAULT false;
