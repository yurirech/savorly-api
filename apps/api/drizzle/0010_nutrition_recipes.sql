CREATE TABLE IF NOT EXISTS "nutrition_recipes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source_recipe_id" uuid REFERENCES "recipes"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "servings" integer DEFAULT 1 NOT NULL,
  "cooked_weight_g" real,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "nutrition_recipes_user_source_idx"
  ON "nutrition_recipes" ("user_id", "source_recipe_id");

CREATE TABLE IF NOT EXISTS "nutrition_recipe_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nutrition_recipe_id" uuid NOT NULL REFERENCES "nutrition_recipes"("id") ON DELETE CASCADE,
  "source_line" text NOT NULL,
  "food_id" uuid REFERENCES "user_foods"("id") ON DELETE SET NULL,
  "grams" real,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "nutrition_recipe_items_recipe_idx"
  ON "nutrition_recipe_items" ("nutrition_recipe_id");

ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "nutrition_recipe_id" uuid
  REFERENCES "nutrition_recipes"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_foods_nutrition_recipe_unique"
  ON "user_foods" ("nutrition_recipe_id")
  WHERE "nutrition_recipe_id" IS NOT NULL;
