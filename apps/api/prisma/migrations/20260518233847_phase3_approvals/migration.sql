-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredPermission" TEXT NOT NULL,
    "decisionPolicy" TEXT NOT NULL DEFAULT 'single',
    "thresholdCount" INTEGER,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confirmationData" JSONB,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Approval_type_status_submittedAt_idx" ON "Approval"("type", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "Approval_status_submittedAt_idx" ON "Approval"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Approval_sourceType_sourceId_status_idx" ON "Approval"("sourceType", "sourceId", "status");

-- CreateIndex
CREATE INDEX "Approval_submittedById_idx" ON "Approval"("submittedById");

-- CreateIndex
CREATE INDEX "ApprovalDecision_approvalId_decidedAt_idx" ON "ApprovalDecision"("approvalId", "decidedAt");

-- CreateIndex
CREATE INDEX "ApprovalDecision_decidedById_idx" ON "ApprovalDecision"("decidedById");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
