import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema";

export const DEFAULT_ADMIN_EMAIL = "admin@savorly.local";
export const DEFAULT_ADMIN_PASSWORD = "admin";

export async function ensureAdminUser(db: Database): Promise<void> {
  const existing = await db.select().from(users).where(eq(users.email, DEFAULT_ADMIN_EMAIL));
  if (existing[0]) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await db.insert(users).values({ email: DEFAULT_ADMIN_EMAIL, passwordHash });
  console.log(`Seeded default admin user (${DEFAULT_ADMIN_EMAIL}).`);
}

export function normalizeLoginEmail(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "admin") {
    return DEFAULT_ADMIN_EMAIL;
  }
  return value;
}
