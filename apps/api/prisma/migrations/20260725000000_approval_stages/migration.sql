-- AlterTable: multi-stage (sequential) approval chains.
-- `stages` is a snapshot of the chain at submit time
-- ([{ requiredPermission, label }]); `currentStage` is the index
-- awaiting a decision. null / single-element stages = legacy
-- single-stage behaviour. ApprovalDecision.stageIndex records which
-- stage each decision resolved.
ALTER TABLE "Approval" ADD COLUMN "stages" JSONB;
ALTER TABLE "Approval" ADD COLUMN "currentStage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApprovalDecision" ADD COLUMN "stageIndex" INTEGER;
