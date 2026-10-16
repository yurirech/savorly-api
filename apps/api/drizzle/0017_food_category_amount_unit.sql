ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "amount_unit" text NOT NULL DEFAULT 'grams';
