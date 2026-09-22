import { and, eq, isNull } from "drizzle-orm";
import {
  STARTER_PANTRY_STAPLES,
  normalizePantryAlias,
  sanitizePantryAliases,
  starterPantryStapleByKey,
  type PantryResponse,
  type UserPantryItem,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { userPantryItems } from "../db/schema";
import { AppError } from "../errors";

function cleanedAliases(displayName: string, aliases: string[]): string[] {
  try {
    return sanitizePantryAliases(displayName, aliases);
  } catch (error) {
    throw new AppError(
      "validation_error",
      error instanceof Error ? error.message : "Invalid pantry item.",
      400,
    );
  }
}

type PantryRow = typeof userPantryItems.$inferSelect;

export function itemFromRow(row: PantryRow): UserPantryItem {
  return {
    id: row.id,
    starterKey: row.starterKey,
    displayName: row.displayName,
    aliases: row.aliases,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getPantry(db: Database, userId: string): Promise<PantryResponse> {
  const rows = await db.select().from(userPantryItems).where(eq(userPantryItems.userId, userId));
  const starterKeys = new Set(rows.map((row) => row.starterKey).filter((key): key is string => Boolean(key)));

  const starters = STARTER_PANTRY_STAPLES.map((starter) => ({
    ...starter,
    inPantry: starterKeys.has(starter.key),
  }));

  const items = rows.filter((row) => row.starterKey == null).map(itemFromRow);
  return { starters, items };
}

export async function setStarterInPantry(
  db: Database,
  userId: string,
  starterKey: string,
  inPantry: boolean,
): Promise<PantryResponse> {
  const starter = starterPantryStapleByKey(starterKey);
  if (!starter) {
    throw new AppError("validation_error", "Unknown starter staple.", 400);
  }

  if (!inPantry) {
    await db
      .delete(userPantryItems)
      .where(and(eq(userPantryItems.userId, userId), eq(userPantryItems.starterKey, starterKey)));
    return getPantry(db, userId);
  }

  const aliases = cleanedAliases(starter.defaultName, starter.defaultAliases);
  const existing = await db
    .select()
    .from(userPantryItems)
    .where(and(eq(userPantryItems.userId, userId), eq(userPantryItems.starterKey, starterKey)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(userPantryItems)
      .set({
        displayName: starter.defaultName,
        aliases,
        updatedAt: new Date(),
      })
      .where(eq(userPantryItems.id, existing[0].id));
  } else {
    await db.insert(userPantryItems).values({
      userId,
      starterKey,
      displayName: starter.defaultName,
      aliases,
    });
  }

  return getPantry(db, userId);
}

export async function createPantryItem(
  db: Database,
  userId: string,
  displayName: string,
  aliases: string[] = [],
): Promise<UserPantryItem> {
  const cleaned = cleanedAliases(displayName, aliases);
  const normalized = normalizePantryAlias(cleaned[0] ?? displayName);

  const customRows = await db
    .select()
    .from(userPantryItems)
    .where(and(eq(userPantryItems.userId, userId), isNull(userPantryItems.starterKey)));

  if (customRows.some((row) => normalizePantryAlias(row.displayName) === normalized)) {
    throw new AppError("validation_error", "You already have a staple with that name.", 400);
  }

  const [row] = await db
    .insert(userPantryItems)
    .values({
      userId,
      starterKey: null,
      displayName: cleaned[0] ?? displayName.trim(),
      aliases: cleaned,
    })
    .returning();

  if (!row) {
    throw new AppError("internal_error", "Could not save pantry item.", 500);
  }

  return itemFromRow(row);
}

export async function updatePantryItem(
  db: Database,
  userId: string,
  itemId: string,
  displayName: string,
  aliases: string[] = [],
): Promise<UserPantryItem> {
  const row = await requireOwnedItem(db, userId, itemId);
  if (row.starterKey) {
    throw new AppError("validation_error", "Starter staples use the checklist toggle.", 400);
  }

  const cleaned = cleanedAliases(displayName, aliases);
  const normalized = normalizePantryAlias(cleaned[0] ?? displayName);

  const customRows = await db
    .select()
    .from(userPantryItems)
    .where(and(eq(userPantryItems.userId, userId), isNull(userPantryItems.starterKey)));

  if (customRows.some((other) => other.id !== itemId && normalizePantryAlias(other.displayName) === normalized)) {
    throw new AppError("validation_error", "You already have a staple with that name.", 400);
  }

  const [updated] = await db
    .update(userPantryItems)
    .set({
      displayName: cleaned[0] ?? displayName.trim(),
      aliases: cleaned,
      updatedAt: new Date(),
    })
    .where(and(eq(userPantryItems.id, itemId), eq(userPantryItems.userId, userId)))
    .returning();

  if (!updated) {
    throw new AppError("not_found", "Pantry item not found.", 404);
  }

  return itemFromRow(updated);
}

export async function deletePantryItem(db: Database, userId: string, itemId: string): Promise<void> {
  await requireOwnedItem(db, userId, itemId);
  await db.delete(userPantryItems).where(and(eq(userPantryItems.id, itemId), eq(userPantryItems.userId, userId)));
}

async function requireOwnedItem(db: Database, userId: string, itemId: string): Promise<PantryRow> {
  const [row] = await db
    .select()
    .from(userPantryItems)
    .where(and(eq(userPantryItems.id, itemId), eq(userPantryItems.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError("not_found", "Pantry item not found.", 404);
  }

  return row;
}
