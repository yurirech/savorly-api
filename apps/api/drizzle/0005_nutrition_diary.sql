CREATE TABLE IF NOT EXISTS "nutrition_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "sex" text NOT NULL,
  "age" integer NOT NULL,
  "height_cm" real NOT NULL,
  "weight_kg" real NOT NULL,
  "activity" text NOT NULL,
  "goal" text NOT NULL,
  "weekly_kg_change" real DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_foods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "source" text NOT NULL,
  "fdc_id" integer,
  "per_100g" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_foods_user_idx" ON "user_foods" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_foods_user_fdc_unique"
  ON "user_foods" ("user_id", "fdc_id")
  WHERE "fdc_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "diary_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "food_id" uuid NOT NULL REFERENCES "user_foods"("id") ON DELETE RESTRICT,
  "date" date NOT NULL,
  "grams" real NOT NULL,
  "nutrients" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "diary_entries_user_date_idx" ON "diary_entries" ("user_id", "date");
