-- CreateTable
CREATE TABLE "CustomNotificationType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "linkTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomNotificationType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomNotificationType_key_key" ON "CustomNotificationType"("key");

-- CreateIndex
CREATE INDEX "CustomNotificationType_isActive_idx" ON "CustomNotificationType"("isActive");
