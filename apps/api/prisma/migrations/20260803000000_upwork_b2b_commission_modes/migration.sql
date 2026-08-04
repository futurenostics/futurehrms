-- Upwork + B2B commission modes.
--   - CommissionRule.designationAmounts: designation → fixed monthly
--     amount ladder for poolMode='designation_fixed' (B2B).
--   - Project.developerSalaryPkr: per-project developer salary (Upwork),
--     subtracted from revenue (in USD) to form the net pool.
-- Both additive + nullable. New poolMode values ('net_revenue_share',
-- 'designation_fixed') need no DDL — poolMode is a free-form string.
ALTER TABLE "CommissionRule" ADD COLUMN "designationAmounts" JSONB;
ALTER TABLE "Project" ADD COLUMN "developerSalaryPkr" DECIMAL(14,2);
