ALTER TABLE "OpdClaim" ADD COLUMN "claimNumber" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "category" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "providerName" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "rejectionReasonCode" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "rejectionComment" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "returnReasonCode" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "returnComment" TEXT;
ALTER TABLE "OpdClaim" ADD COLUMN "returnedAt" TIMESTAMP(3);

WITH numbered AS (
  SELECT
    id,
    'MC-' || to_char("createdAt", 'YYYY') || '-' || lpad(
      row_number() OVER (PARTITION BY date_trunc('year', "createdAt") ORDER BY "createdAt")::text,
      5,
      '0'
    ) AS num
  FROM "OpdClaim"
)
UPDATE "OpdClaim" c SET "claimNumber" = n.num FROM numbered n WHERE c.id = n.id;

UPDATE "OpdClaim" SET "category" = 'opd' WHERE "category" IS NULL;

ALTER TABLE "OpdClaim" ALTER COLUMN "claimNumber" SET NOT NULL;
ALTER TABLE "OpdClaim" ALTER COLUMN "category" SET NOT NULL;

CREATE UNIQUE INDEX "OpdClaim_claimNumber_key" ON "OpdClaim"("claimNumber");
