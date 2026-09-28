CREATE TABLE IF NOT EXISTS "diary_meal_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "diary_meal_templates_user_name_unique"
  ON "diary_meal_templates" ("user_id", "name");

CREATE INDEX IF NOT EXISTS "diary_meal_templates_user_idx"
  ON "diary_meal_templates" ("user_id", "sort_order");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "meal_templates_seeded_at" timestamptz;
