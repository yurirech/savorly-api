CREATE TABLE IF NOT EXISTS "meal_staples" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "meal_name" text NOT NULL,
  "food_id" uuid NOT NULL REFERENCES "user_foods"("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "meal_name", "food_id")
);

CREATE INDEX IF NOT EXISTS "meal_staples_user_meal_idx"
  ON "meal_staples" ("user_id", "meal_name");
