CREATE TABLE IF NOT EXISTS "cookbooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cookbooks_user_updated_idx" ON "cookbooks" ("user_id", "updated_at");

CREATE TABLE IF NOT EXISTS "cookbook_recipes" (
  "cookbook_id" uuid NOT NULL REFERENCES "cookbooks"("id") ON DELETE CASCADE,
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "added_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("cookbook_id", "recipe_id")
);

CREATE INDEX IF NOT EXISTS "cookbook_recipes_recipe_idx" ON "cookbook_recipes" ("recipe_id");
