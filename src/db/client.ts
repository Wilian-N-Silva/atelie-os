import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const globalForDb = globalThis as unknown as {
  atelieSql?: postgres.Sql;
};

export const sqlClient =
  globalForDb.atelieSql ??
  postgres(databaseUrl, {
    // Keep more than one connection in dev too: routes open transactions that
    // run nested queries, which need a second connection. A single-connection
    // pool deadlocks (transaction holds the only connection, nested query waits
    // for one that never frees). The globalThis cache still prevents pool churn
    // across hot reloads.
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.atelieSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
