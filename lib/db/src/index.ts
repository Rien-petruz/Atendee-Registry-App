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
    process.env.STORAGE_POSTGRES_PRISMA_URL;
  
  if (!conn && process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Database connection string not found in environment variables.");
  }
  return conn;
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });
