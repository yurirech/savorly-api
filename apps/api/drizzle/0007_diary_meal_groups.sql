CREATE TABLE IF NOT EXISTS "diary_meals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "diary_meals_user_date_idx" ON "diary_meals" ("user_id", "date");

ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "meal_id" uuid REFERENCES "diary_meals"("id") ON DELETE CASCADE;

INSERT INTO "diary_meals" ("id", "user_id", "date", "name", "sort_order")
SELECT gen_random_uuid(), "user_id", "date", 'General', 0
FROM "diary_entries"
WHERE "meal_id" IS NULL
GROUP BY "user_id", "date";

UPDATE "diary_entries" AS e
SET "meal_id" = m."id"
FROM "diary_meals" AS m
WHERE e."meal_id" IS NULL
  AND e."user_id" = m."user_id"
  AND e."date" = m."date"
  AND m."name" = 'General';

ALTER TABLE "diary_entries" ALTER COLUMN "meal_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "diary_entries_meal_idx" ON "diary_entries" ("meal_id");
