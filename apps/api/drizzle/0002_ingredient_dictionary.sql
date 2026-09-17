CREATE TABLE IF NOT EXISTS "ingredient_dictionary" (
  "key" text PRIMARY KEY NOT NULL,
  "grams_per_cup" real NOT NULL,
  "aliases" text[] DEFAULT '{}' NOT NULL
);
