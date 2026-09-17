import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
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
