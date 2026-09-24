ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'food';
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "label" text;

ALTER TABLE "diary_entries" ALTER COLUMN "food_id" DROP NOT NULL;

ALTER TABLE "diary_entries" DROP CONSTRAINT IF EXISTS "diary_entries_kind_check";

ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_kind_check" CHECK (
  ("kind" = 'food' AND "food_id" IS NOT NULL)
  OR ("kind" = 'quick' AND "food_id" IS NULL AND "label" IS NOT NULL)
);
