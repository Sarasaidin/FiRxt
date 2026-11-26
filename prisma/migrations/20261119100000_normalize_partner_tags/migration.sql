
BEGIN;

-- Normalize only the two identified partner records.
UPDATE "partners"
SET "tags" = ARRAY[]::TEXT[]
WHERE "id" IN (
    'cmp0wycrn0002l8zcmj3titq4',
    'cmovji1ak0002l804cqjnetm1'
)
AND "tags" IS NULL;

-- Align the live column constraint with Prisma's String[] definition.
ALTER TABLE "partners"
ALTER COLUMN "tags" SET NOT NULL;

COMMIT;
