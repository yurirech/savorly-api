CREATE TABLE IF NOT EXISTS "user_pantry_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "starter_key" text,
  "display_name" text NOT NULL,
  "aliases" text[] DEFAULT '{}' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_pantry_items_user_idx" ON "user_pantry_items" ("user_id");
CREATE INDEX IF NOT EXISTS "user_pantry_items_user_starter_idx" ON "user_pantry_items" ("user_id", "starter_key");

CREATE UNIQUE INDEX IF NOT EXISTS "user_pantry_items_user_starter_unique"
  ON "user_pantry_items" ("user_id", "starter_key")
  WHERE "starter_key" IS NOT NULL;
