-- Up to 3 supporting documents per claim (prescription, itemised bill, etc.).
CREATE TABLE "OpdClaimDocument" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpdClaimDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpdClaimDocument_claimId_idx" ON "OpdClaimDocument"("claimId");

ALTER TABLE "OpdClaimDocument" ADD CONSTRAINT "OpdClaimDocument_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "OpdClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OpdClaimDocument" ("id", "claimId", "storageKey", "fileName", "sortOrder", "createdAt")
SELECT
  'migrated_' || "id",
  "id",
  "prescriptionStorageKey",
  COALESCE("prescriptionFileName", 'prescription'),
  0,
  "createdAt"
FROM "OpdClaim"
WHERE "prescriptionStorageKey" IS NOT NULL;

ALTER TABLE "OpdClaim" DROP COLUMN IF EXISTS "prescriptionStorageKey";
ALTER TABLE "OpdClaim" DROP COLUMN IF EXISTS "prescriptionFileName";
