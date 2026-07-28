-- AlterTable: tiered pool support on CommissionRule.
-- revenueBrackets holds the ascending, non-overlapping bracket array
-- [{ minUsd, maxUsd|null, poolPct }] used when poolMode='tiered'. Null
-- for percentage/fixed rules. poolMode itself stays a free String
-- column (the API layer constrains it to percentage|fixed|tiered).
ALTER TABLE "CommissionRule" ADD COLUMN "revenueBrackets" JSONB;
