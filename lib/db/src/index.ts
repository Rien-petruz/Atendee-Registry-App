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

  if (!conn) {
    console.error("CRITICAL: Database connection string not found in environment variables.");
    console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES')));
  } else {
    console.log("✅ Database connection string found");
  }
  return conn;
}

// For serverless environments, use connection pooling options that work well with functions
const connectionString = getConnectionString();
export const pool = new Pool({
  connectionString,
  max: 1, // Serverless functions should use minimal connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased for serverless cold starts
  statement_timeout: 15000,
  query_timeout: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
  application_name: 'attendee-registry-api',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✅ New client connected to pool');
});

export const db = drizzle(pool, { schema });
