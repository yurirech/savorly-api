import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { users } from "./schema";

export const DEFAULT_ADMIN_EMAIL = "admin@savorly.local";

export async function ensureAdminUser(db: Database, password?: string): Promise<void> {
  if (!password) {
    console.warn("ADMIN_PASSWORD is not set; skipping admin seed.");
    return;
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await db.select().from(users).where(eq(users.email, DEFAULT_ADMIN_EMAIL));
  if (existing[0] && (await bcrypt.compare(password, existing[0].passwordHash))) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (existing[0]) {
    await db.update(users).set({ passwordHash }).where(eq(users.email, DEFAULT_ADMIN_EMAIL));
    console.log(`Updated admin password (${DEFAULT_ADMIN_EMAIL}).`);
    return;
  }

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
