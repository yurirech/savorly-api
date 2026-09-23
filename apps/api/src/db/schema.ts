import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    ingredients: jsonb("ingredients").notNull(),
    steps: jsonb("steps").notNull(),
    tags: text("tags").array().notNull().default([]),
    notes: text("notes"),
    uncertainties: jsonb("uncertainties").notNull(),
    nutrition: jsonb("nutrition"),
    source: jsonb("source").notNull(),
    ingredientNames: text("ingredient_names").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recipes_user_title_idx").on(table.userId, table.title),
    index("recipes_user_category_idx").on(table.userId, table.category),
    index("recipes_tags_idx").using("gin", table.tags),
    index("recipes_ingredient_names_idx").using("gin", table.ingredientNames),
  ],
);

export const cookbooks = pgTable(
  "cookbooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cookbooks_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const cookbookRecipes = pgTable(
  "cookbook_recipes",
  {
    cookbookId: uuid("cookbook_id")
      .notNull()
      .references(() => cookbooks.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cookbookId, table.recipeId] }),
    index("cookbook_recipes_recipe_idx").on(table.recipeId),
  ],
);

export const ingredientDictionary = pgTable("ingredient_dictionary", {
  key: text("key").primaryKey(),
  gramsPerCup: real("grams_per_cup").notNull(),
  aliases: text("aliases").array().notNull().default([]),
});

export const userPantryItems = pgTable(
  "user_pantry_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    starterKey: text("starter_key"),
    displayName: text("display_name").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_pantry_items_user_idx").on(table.userId),
    index("user_pantry_items_user_starter_idx").on(table.userId, table.starterKey),
  ],
);

export const nutritionProfiles = pgTable("nutrition_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex").notNull(),
  age: integer("age").notNull(),
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  activity: text("activity").notNull(),
  goal: text("goal").notNull(),
  weeklyKgChange: real("weekly_kg_change").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userFoods = pgTable(
  "user_foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    source: text("source").notNull(),
    fdcId: integer("fdc_id"),
    nevoCode: integer("nevo_code"),
    per100g: jsonb("per_100g").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_foods_user_idx").on(table.userId),
    uniqueIndex("user_foods_user_fdc_unique")
      .on(table.userId, table.fdcId)
      .where(sql`${table.fdcId} is not null`),
    uniqueIndex("user_foods_user_nevo_unique")
      .on(table.userId, table.nevoCode)
      .where(sql`${table.nevoCode} is not null`),
  ],
);

export const nevoFoods = pgTable("nevo_foods", {
  nevoCode: integer("nevo_code").primaryKey().notNull(),
  version: text("version").notNull(),
  foodGroupNl: text("food_group_nl").notNull(),
  nameNl: text("name_nl").notNull(),
  nameEn: text("name_en").notNull(),
  searchText: text("search_text").notNull(),
  per100g: jsonb("per_100g").notNull(),
});

export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => userFoods.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    grams: real("grams").notNull(),
    nutrients: jsonb("nutrients").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("diary_entries_user_date_idx").on(table.userId, table.date)],
);
