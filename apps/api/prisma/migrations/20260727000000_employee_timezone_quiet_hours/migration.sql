-- AlterTable: per-employee reminder delivery preferences.
-- timezone: IANA zone (null = org default). quietHoursStart/End: wall-clock
-- "HH:MM" in the employee's timezone; reminders due inside the window are
-- deferred to quietHoursEnd. Both null = no quiet hours.
ALTER TABLE "Employee" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Employee" ADD COLUMN "quietHoursStart" TEXT;
ALTER TABLE "Employee" ADD COLUMN "quietHoursEnd" TEXT;
