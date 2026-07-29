-- AlterTable: per-person payout guardrails on CommissionRule.
-- Both nullable; null = no bound. Applied by the calc engine to each
-- line item's calculatedAmountUsd (floor lifts eligible non-zero
-- shares, cap clamps down). Cap >= floor enforced at the API layer.
ALTER TABLE "CommissionRule" ADD COLUMN "perPersonFloorUsd" DECIMAL(12,2);
ALTER TABLE "CommissionRule" ADD COLUMN "perPersonCapUsd" DECIMAL(12,2);
