-- Reminder delivery retry + dead-letter. Additive columns; `attempts`
-- backfills to 0 for existing rows. A new `failed` status value is
-- used by the scheduler once attempts hit the cap (no enum change —
-- status is a free-form string column).
ALTER TABLE "Reminder" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Reminder" ADD COLUMN "lastError" TEXT;
ALTER TABLE "Reminder" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);
