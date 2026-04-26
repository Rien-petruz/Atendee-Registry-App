import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export * from "drizzle-orm";
export * from "./schema/index.js";

const { Pool } = pg;

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.STORAGE_POSTGRES_URL || 
  process.env.STORAGE_POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    "Database connection string not found. Please set DATABASE_URL or STORAGE_POSTGRES_URL in Vercel.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
