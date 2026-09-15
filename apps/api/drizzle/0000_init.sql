CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "servings" integer,
  "prep_time_minutes" integer,
  "cook_time_minutes" integer,
  "ingredients" jsonb NOT NULL,
  "steps" jsonb NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "notes" text,
  "uncertainties" jsonb NOT NULL,
  "source" jsonb NOT NULL,
  "ingredient_names" text[] DEFAULT '{}' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "recipes_user_title_idx" ON "recipes" ("user_id", "title");
CREATE INDEX IF NOT EXISTS "recipes_user_category_idx" ON "recipes" ("user_id", "category");
CREATE INDEX IF NOT EXISTS "recipes_tags_idx" ON "recipes" USING gin ("tags");
CREATE INDEX IF NOT EXISTS "recipes_ingredient_names_idx" ON "recipes" USING gin ("ingredient_names");
CREATE INDEX IF NOT EXISTS "recipes_source_name_idx" ON "recipes" ((source->>'sourceName'));
CREATE INDEX IF NOT EXISTS "recipes_source_author_idx" ON "recipes" ((source->>'author'));
