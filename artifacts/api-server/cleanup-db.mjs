#!/usr/bin/env node
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attendeesTable, attendancesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function cleanup() {
  try {
    console.log("🧹 Cleaning up database...\n");

    // Delete all attendance records
    console.log("Deleting attendance records...");
    await db.delete(attendancesTable);
    console.log("✓ Deleted attendance records\n");

    // Delete all attendees
    console.log("Deleting attendees...");
    await db.delete(attendeesTable);
    console.log("✓ Deleted attendees\n");

    // Verify tables are empty
    const attendeeCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(attendeesTable);
    const attendanceCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(attendancesTable);

    console.log("Verification:");
    console.log(`  Attendees: ${attendeeCount[0].count}`);
    console.log(`  Attendances: ${attendanceCount[0].count}`);
    console.log("\n✅ Database cleanup complete!");

    await pool.end();
  } catch (err) {
    console.error("❌ Error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

cleanup();
