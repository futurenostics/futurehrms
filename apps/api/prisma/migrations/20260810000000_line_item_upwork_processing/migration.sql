-- Module 4 Upwork processing: manual period-revenue entry + payout
-- source on commission line items. Additive nullable columns.
ALTER TABLE "CommissionLineItem" ADD COLUMN "periodRevenueUsd" DECIMAL(12,2);
ALTER TABLE "CommissionLineItem" ADD COLUMN "paymentSource" TEXT;
