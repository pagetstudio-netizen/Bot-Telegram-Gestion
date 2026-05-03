import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("SUPABASE_DATABASE_URL ou DATABASE_URL doit être défini.");
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString: rawUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (isSupabase) {
  const originalQuery = pool.query.bind(pool);
  (pool as any).query = (...args: any[]) => {
    if (args[0] && typeof args[0] === "object" && args[0].name) {
      const { name, ...rest } = args[0];
      args[0] = rest;
    }
    return (originalQuery as any)(...args);
  };
}

pool.on("error", (err) => {
  console.error("Unexpected DB pool error", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
