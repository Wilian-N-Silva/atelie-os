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
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.atelieSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
