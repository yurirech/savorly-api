CREATE TABLE IF NOT EXISTS "diary_day_targets" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "kcal" integer NOT NULL,
  PRIMARY KEY ("user_id", "date")
);
