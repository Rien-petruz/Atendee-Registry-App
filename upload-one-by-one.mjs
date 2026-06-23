#!/usr/bin/env node
import fs from "fs";

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

const API_URL = process.env.API_URL || "https://attendee-registry-app.vercel.app/api";
const CSV_PATH = "C:/Users/Rien/Downloads/attendees-import-FINAL.csv";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required");
  process.exit(1);
}

async function uploadOneByOne() {
  try {
    // Read CSV
    console.log("📂 Reading CSV...");
    const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
    const records = parseCSV(csvContent);
    console.log(`✓ Loaded ${records.length} records\n`);

    // Login
    console.log("🔐 Logging in...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      console.error(`❌ Login failed: ${err.message}`);
      process.exit(1);
    }

    const { token } = await loginRes.json();
    console.log("✓ Logged in\n");

    // Track results
    let created = 0;
    let errors = 0;
    let attendanceCount = 0;

    // Upload each attendee one by one
    console.log(`📤 Uploading ${records.length} attendees one by one...\n`);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const fullName = row.fullName?.trim() || "";
      const email = (row.email?.trim() || "").toLowerCase();
      const phoneNumber = row.phoneNumber?.trim() || `${9000000000 + i}`;
      const isNewcomer = row.isNewcomer === "true";
      const month = Number(row.month);
      const year = Number(row.year);

      if (!fullName) {
        console.log(`⚠️  Row ${i + 1}: Skipped (no name)`);
        errors++;
        continue;
      }

      try {
        // Create attendee
        const createRes = await fetch(`${API_URL}/attendees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName,
            email: email || `placeholder_${fullName.toLowerCase().replace(/\s+/g, "_")}_${i}@placeholder.local`,
            phoneNumber,
            isNewcomer
          })
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          // If attendee already exists, that's OK
          if (createRes.status === 409 || err.message?.includes("already exists")) {
            console.log(`✓ Row ${i + 1}: Attendee already exists (${fullName})`);
          } else {
            console.error(`✗ Row ${i + 1}: Failed to create (${fullName}) - ${err.message}`);
            errors++;
            continue;
          }
        } else {
          const attendee = await createRes.json();
          console.log(`✓ Row ${i + 1}: Created ${fullName}`);
          created++;
        }

        // Create attendance record
        const attendanceRes = await fetch(`${API_URL}/attendees/${email || `placeholder_${fullName.toLowerCase().replace(/\s+/g, "_")}_${i}@placeholder.local`}/attendances`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ month, year })
        });

        if (attendanceRes.ok) {
          attendanceCount++;
        }

      } catch (err) {
        console.error(`✗ Row ${i + 1}: Error - ${err.message}`);
        errors++;
      }

      // Show progress every 10 rows
      if ((i + 1) % 10 === 0) {
        console.log(`  ... ${i + 1}/${records.length} rows processed\n`);
      }
    }

    console.log(`\n✅ Upload complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Attendances: ${attendanceCount}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

uploadOneByOne();
