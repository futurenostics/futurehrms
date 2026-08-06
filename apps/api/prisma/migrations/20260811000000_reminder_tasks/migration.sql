-- Reminders: follow-up tasks with an open/completed lifecycle. A
-- task-generating reminder (probation/internship/review) spawns one of
-- these; the scheduler re-notifies the assignee on a cadence until the
-- task is completed or cancelled.
CREATE TABLE "ReminderTask" (
  "id"                TEXT NOT NULL,
  "ruleId"            TEXT NOT NULL,
  "notificationType"  TEXT NOT NULL,
  "assigneeUserId"    TEXT NOT NULL,
  "sourceType"        TEXT,
  "sourceId"          TEXT,
  "title"             TEXT NOT NULL,
  "description"       TEXT,
  "dueDate"           TIMESTAMP(3) NOT NULL,
  "followUpEveryDays" INTEGER NOT NULL DEFAULT 3,
  "status"            TEXT NOT NULL DEFAULT 'open',
  "overdue"           BOOLEAN NOT NULL DEFAULT false,
  "followUpCount"     INTEGER NOT NULL DEFAULT 0,
  "lastFollowUpAt"    TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "completedById"     TEXT,
  "completionNote"    TEXT,
  "cancelledAt"       TIMESTAMP(3),
  "cancelledById"     TEXT,
  "cancelReason"      TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReminderTask_status_dueDate_idx" ON "ReminderTask"("status", "dueDate");
CREATE INDEX "ReminderTask_assigneeUserId_status_idx" ON "ReminderTask"("assigneeUserId", "status");
CREATE INDEX "ReminderTask_ruleId_status_idx" ON "ReminderTask"("ruleId", "status");
CREATE INDEX "ReminderTask_sourceType_sourceId_idx" ON "ReminderTask"("sourceType", "sourceId");

ALTER TABLE "ReminderTask"
  ADD CONSTRAINT "ReminderTask_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "ReminderRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
