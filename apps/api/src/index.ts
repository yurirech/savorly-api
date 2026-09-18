import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadEnv } from "./config";
import { createDb } from "./db/client";
import { ensureAdminUser } from "./db/seedAdmin";
import { ensureAdminDemoKitchen } from "./db/seedDemoKitchen";

const env = loadEnv();
const db = createDb(env.databaseUrl);
await ensureAdminUser(db, env.adminPassword);
await ensureAdminDemoKitchen(db);
const app = createApp(db, env);

serve({ fetch: app.fetch, port: env.port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Savorly API listening on http://0.0.0.0:${info.port}`);
});
