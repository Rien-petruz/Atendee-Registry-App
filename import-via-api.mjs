#!/usr/bin/env node
/**
 * CSV Attendee Import via API
 *
 * Usage:
 *   ADMIN_EMAIL=user@example.com ADMIN_PASSWORD=password node import-via-api.mjs
 *   AUTH_TOKEN=jwt-token node import-via-api.mjs
 */

import fs from 'fs';

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = line.split(',').map(v => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx];
    });
    records.push(record);
  }
  return records;
}

const API_URL = process.env.API_URL || 'https://attendee-registry-app.vercel.app/api';
const CSV_PATH = 'C:/Users/Rien/Downloads/attendees-import-FINAL.csv';

// Load credentials from environment (never hardcode)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN && (!ADMIN_EMAIL || !ADMIN_PASSWORD)) {
  console.error(`
❌ Missing credentials

Either set AUTH_TOKEN:
  AUTH_TOKEN=your-jwt-token node import-via-api.mjs

Or set ADMIN_EMAIL and ADMIN_PASSWORD:
  ADMIN_EMAIL=user@example.com ADMIN_PASSWORD=pass node import-via-api.mjs
  `);
  process.exit(1);
}

async function importCSV() {
  try {
    // Read and parse CSV
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ CSV file not found: ${CSV_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parseCSV(csvContent);
    console.log(`Loaded ${records.length} records from CSV\n`);

    // Convert to API format
    const rows = records.map(r => ({
      fullName: r.fullName,
      email: r.email || '',
      phoneNumber: r.phoneNumber || '',
      isNewcomer: r.isNewcomer === 'true',
      month: parseInt(r.month),
      year: parseInt(r.year)
    }));

    let token = AUTH_TOKEN;

    // Login if needed
    if (!token) {
      console.log('1️⃣ Logging in...');
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      });

      if (!loginRes.ok) {
        const err = await loginRes.json();
        console.error(`❌ Login failed: ${err.message}`);
        process.exit(1);
      }

      const data = await loginRes.json();
      token = data.token;
      console.log('✓ Logged in successfully\n');
    }

    // Import CSV
    console.log(`2️⃣ Importing ${rows.length} rows...`);
    const importRes = await fetch(`${API_URL}/attendees/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rows })
    });

    const result = await importRes.json();

    if (!importRes.ok) {
      console.error(`❌ Import failed: ${result.error}\n${result.message}`);
      process.exit(1);
    }

    console.log('✓ Import completed!\n');
    console.log('Results:');
    console.log(`  Created attendees: ${result.createdAttendees || 0}`);
    console.log(`  Attendances added: ${result.attendancesAdded || 0}`);
    console.log(`  Skipped: ${result.skipped || 0}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(e => {
        console.log(`  Row ${e.rowNumber}: ${e.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

importCSV();
