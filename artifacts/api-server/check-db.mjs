#!/usr/bin/env node
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attendeesTable, attendancesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function check() {
  try {
    const [attendeeResult] = await db.select({ count: sql`COUNT(*)` }).from(attendeesTable);
    const [attendanceResult] = await db.select({ count: sql`COUNT(*)` }).from(attendancesTable);

    console.log("Current database state:");
    console.log(`  Attendees: ${attendeeResult.count}`);
    console.log(`  Attendances: ${attendanceResult.count}`);

    await pool.end();
  } catch (err) {
    console.error("Error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

check();
