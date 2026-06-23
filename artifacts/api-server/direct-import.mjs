#!/usr/bin/env node
import fs from "fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attendeesTable, attendancesTable, eq } from "@workspace/db";

const DATABASE_URL = process.env.DATABASE_URL;
const CSV_PATH = "C:/Users/Rien/Downloads/attendees-import-FINAL.csv";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = line.split(",").map(v => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx];
    });
    records.push(record);
  }
  return records;
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function importData() {
  try {
    console.log("📂 Reading CSV file...");
    const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
    const records = parseCSV(csvContent);
    console.log(`✓ Loaded ${records.length} records\n`);

    // Deduplicate by email
    const uniqueAttendees = new Map();
    const attendances = [];
    let placeholderCounter = 9000000000;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const fullName = row.fullName?.trim() || "";
      const email = (row.email?.trim() || "").toLowerCase();
      const phoneNumber = row.phoneNumber?.trim() || "";
      const isNewcomer = row.isNewcomer === "true";
      const month = Number(row.month);
      const year = Number(row.year);

      if (!fullName || !Number.isInteger(month) || !Number.isInteger(year)) {
        console.warn(`⚠️  Skipping invalid row ${i + 1}`);
        continue;
      }

      const finalEmail = email || `placeholder_${fullName.toLowerCase().replace(/\s+/g, "_")}@placeholder.local`;
      const finalPhone = phoneNumber || `${placeholderCounter++}`;
      const createdAt = new Date(Date.UTC(year, month - 1, 1));

      // Deduplicate attendees by email
      if (!uniqueAttendees.has(finalEmail)) {
        uniqueAttendees.set(finalEmail, {
          fullName,
          email: finalEmail,
          phoneNumber: finalPhone,
          isNewcomer,
          createdAt,
        });
      }

      // Track attendance separately
      attendances.push({ email: finalEmail, month, year });
    }

    console.log(`📊 Processing:`);
    console.log(`  Total rows: ${records.length}`);
    console.log(`  Unique attendees: ${uniqueAttendees.size}`);
    console.log(`  Total attendances: ${attendances.length}\n`);

    // Insert attendees one by one
    console.log("👤 Inserting attendees...");
    const attendeeIds = new Map();

    for (const [email, attendeeData] of uniqueAttendees) {
      try {
        const [inserted] = await db
          .insert(attendeesTable)
          .values(attendeeData)
          .returning();

        attendeeIds.set(email, inserted.id);
      } catch (err) {
        // Try to find existing
        try {
          const existing = await db
            .select()
            .from(attendeesTable)
            .where(eq(attendeesTable.email, email));

          if (existing.length > 0) {
            attendeeIds.set(email, existing[0].id);
          } else {
            console.error(`✗ Failed to insert or find attendee: ${email}`);
          }
        } catch (selectErr) {
          console.error(`✗ Error for ${email}: Insert failed: ${err.message}, Select failed: ${selectErr.message}`);
        }
      }
    }

    console.log(`✓ Processed ${attendeeIds.size} attendees\n`);

    // Insert attendances
    console.log("📅 Inserting attendance records...");
    const attendancesToInsert = attendances
      .map(({ email, month, year }) => {
        const attendeeId = attendeeIds.get(email);
        return attendeeId ? { attendeeId, month, year } : null;
      })
      .filter(a => a !== null);

    if (attendancesToInsert.length > 0) {
      const inserted = await db.insert(attendancesTable).values(attendancesToInsert).returning();
      console.log(`✓ Inserted ${inserted.length} attendance records\n`);
    }

    console.log(`✅ Import complete!`);
    console.log(`   - Attendees: ${attendeeIds.size}`);
    console.log(`   - Attendances: ${attendancesToInsert.length}`);

    await pool.end();
  } catch (err) {
    console.error("❌ Error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

importData();
