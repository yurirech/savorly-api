CREATE TABLE IF NOT EXISTS "nevo_foods" (
  "nevo_code" integer PRIMARY KEY NOT NULL,
  "version" text NOT NULL,
  "food_group_nl" text NOT NULL,
  "name_nl" text NOT NULL,
  "name_en" text NOT NULL,
  "search_text" text NOT NULL,
  "per_100g" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "nevo_foods_search_idx" ON "nevo_foods" USING gin (to_tsvector('simple', "search_text"));

ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "nevo_code" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "user_foods_user_nevo_unique"
  ON "user_foods" ("user_id", "nevo_code")
  WHERE "nevo_code" IS NOT NULL;
