-- AlterTable: acknowledge + snooze on Notification.
-- acknowledgedAt: explicit "handled" marker (stronger than read).
-- snoozedUntil: while in the future, the notification is hidden from the
-- bell + unread count, then resurfaces once the time passes.
ALTER TABLE "Notification" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "snoozedUntil" TIMESTAMP(3);
