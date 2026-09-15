import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthResponse } from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { users } from "../db/schema";
import { normalizeLoginEmail } from "../db/seedAdmin";
import { AppError } from "../errors";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export function createAuthApp(db: Database, env: Env) {
  const app = new Hono();

  app.post("/register", async (c) => {
    const body = registerSchema.parse(await c.req.json());
    const existing = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
    if (existing[0]) {
      throw new AppError("conflict", "An account with this email already exists.", 409);
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db
      .insert(users)
      .values({ email: body.email.toLowerCase(), passwordHash })
      .returning();
    return c.json(await issue(user.id, user.email, env.jwtSecret));
  });

  app.post("/login", async (c) => {
    const body = loginSchema.parse(await c.req.json());
    const email = normalizeLoginEmail(body.email);
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError("unauthorized", "Invalid email or password.", 401);
    }
    return c.json(await issue(user.id, user.email, env.jwtSecret));
  });

  return app;
}

export async function requireUser(
  authorization: string | undefined,
  jwtSecret: string,
): Promise<{ id: string; email: string }> {
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("unauthorized", "Sign in to continue.", 401);
  }
  try {
    const token = authorization.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, secretKey(jwtSecret));
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new Error("invalid");
    }
    return { id: payload.sub, email: payload.email };
  } catch {
    throw new AppError("unauthorized", "Sign in to continue.", 401);
  }
}

async function issue(id: string, email: string, jwtSecret: string): Promise<AuthResponse> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey(jwtSecret));
  return { token, user: { id, email } };
}

function secretKey(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret);
}
