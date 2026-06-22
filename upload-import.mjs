import fs from 'fs';

// Simple CSV parser
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

const API_URL = 'https://attendee-registry-app.vercel.app/api';

// Load from environment - never hardcode credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  if (!AUTH_TOKEN) {
    console.error('❌ Missing credentials: set ADMIN_EMAIL, ADMIN_PASSWORD, or AUTH_TOKEN environment variable');
    process.exit(1);
  }
}

// Read CSV file
const csvPath = 'C:/Users/Rien/Downloads/attendees-import-FINAL.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);

console.log(`Loaded ${records.length} records from CSV`);

// Convert string boolean values to actual booleans
const rows = records.map(r => ({
  fullName: r.fullName,
  email: r.email || '',
  phoneNumber: r.phoneNumber || '',
  isNewcomer: r.isNewcomer === 'true' || r.isNewcomer === 'TRUE',
  month: parseInt(r.month),
  year: parseInt(r.year)
}));

console.log(`First row:`, rows[0]);

async function importData() {
  try {
    let token = AUTH_TOKEN;

    // If no token provided, login first
    if (!token) {
      console.log('1. Logging in...');
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        console.error('❌ Login failed:', errorData);
        process.exit(1);
      }

      const loginData = await loginResponse.json();
      token = loginData.token;
      console.log('✓ Login successful');
    }

    // Import CSV data
    console.log(`\n2. Importing ${rows.length} rows...`);
    const importResponse = await fetch(`${API_URL}/attendees/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rows })
    });

    console.log(`Response status: ${importResponse.status}`);
    const importData = await importResponse.json();

    if (importResponse.ok) {
      console.log('✓ Import successful!');
      console.log(`  Created: ${importData.created || importData.createdAttendees || 0}`);
      console.log(`  Attendances added: ${importData.attendancesAdded || 0}`);
      console.log(`  Skipped: ${importData.skipped || 0}`);
      if (importData.errors && importData.errors.length > 0) {
        console.log(`  Errors: ${importData.errors.length}`);
        importData.errors.slice(0, 5).forEach(e => {
          console.log(`    - Row ${e.rowNumber}: ${e.message}`);
        });
      }
    } else {
      console.error('❌ Import failed:', importData);
    }
  } catch (error) {
    console.error('Import failed:', error.message);
  }
}

importData();
