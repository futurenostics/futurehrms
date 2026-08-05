-- Role-fixed commission mode (Engineering External): a role → fixed
-- monthly amount ladder. Additive nullable JSON column. The new
-- poolMode value 'role_fixed' needs no DDL (poolMode is free-form text).
ALTER TABLE "CommissionRule" ADD COLUMN "roleAmounts" JSONB;
