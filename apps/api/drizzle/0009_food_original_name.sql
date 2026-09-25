ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "original_name" text;
UPDATE "user_foods" SET "original_name" = "name" WHERE "original_name" IS NULL;
ALTER TABLE "user_foods" ALTER COLUMN "original_name" SET NOT NULL;
