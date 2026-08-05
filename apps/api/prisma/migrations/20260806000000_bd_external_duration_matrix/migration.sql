-- BD External duration-matrix commission mode: a (sub-type × role)
-- matrix of time-limited fixed amounts. Additive nullable JSON column.
-- The new poolMode value 'duration_matrix' needs no DDL.
ALTER TABLE "CommissionRule" ADD COLUMN "durationMatrix" JSONB;
