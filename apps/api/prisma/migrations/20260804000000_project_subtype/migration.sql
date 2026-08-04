-- External project engagement sub-type. Additive nullable string;
-- constrained at the API layer (projectSubTypeSchema).
ALTER TABLE "Project" ADD COLUMN "subType" TEXT;
