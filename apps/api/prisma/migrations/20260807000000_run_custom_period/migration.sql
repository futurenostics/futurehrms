-- Optional custom processing window on a commission run (Upwork
-- custom date-range). Additive nullable columns; null = full month.
ALTER TABLE "CommissionRun" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "CommissionRun" ADD COLUMN "periodEnd" TIMESTAMP(3);
