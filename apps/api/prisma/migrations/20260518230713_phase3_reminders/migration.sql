-- CreateTable
CREATE TABLE "ReminderRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "triggerType" TEXT NOT NULL,
    "triggerSpec" JSONB NOT NULL,
    "notificationType" TEXT NOT NULL,
    "recipientResolver" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "payload" JSONB,
    "firedAt" TIMESTAMP(3),
    "notificationId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderRule_key_status_idx" ON "ReminderRule"("key", "status");

-- CreateIndex
CREATE INDEX "ReminderRule_status_triggerType_idx" ON "ReminderRule"("status", "triggerType");

-- CreateIndex
CREATE INDEX "ReminderRule_notificationType_idx" ON "ReminderRule"("notificationType");

-- CreateIndex
CREATE INDEX "Reminder_status_scheduledFor_idx" ON "Reminder"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Reminder_ruleId_status_idx" ON "Reminder"("ruleId", "status");

-- CreateIndex
CREATE INDEX "Reminder_recipientUserId_status_idx" ON "Reminder"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "Reminder_sourceType_sourceId_idx" ON "Reminder"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReminderRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
