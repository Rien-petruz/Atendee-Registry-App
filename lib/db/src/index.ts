import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export * from "drizzle-orm";
export * from "./schema/index.js";

const { Pool } = pg;

function getConnectionString() {
  const conn =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.STORAGE_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_POSTGRES_URL_NON_POOLING;

  if (!conn && process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Database connection string not found in environment variables.");
  }
  return conn;
}

// For serverless environments, use connection pooling options that work well with functions
const connectionString = getConnectionString();
export const pool = new Pool({
  connectionString,
  max: 1, // Serverless functions should use minimal connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
