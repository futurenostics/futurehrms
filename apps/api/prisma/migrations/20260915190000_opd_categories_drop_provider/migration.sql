-- Remap legacy category slugs to the new taxonomy
UPDATE "OpdClaim" SET "category" = 'doctor_consultation' WHERE "category" = 'opd';
UPDATE "OpdClaim" SET "category" = 'medicines_supplies' WHERE "category" IN ('medicine', 'medicines');
UPDATE "OpdClaim" SET "category" = 'optical' WHERE "category" = 'optics';

ALTER TABLE "OpdClaim" DROP COLUMN IF EXISTS "providerName";
