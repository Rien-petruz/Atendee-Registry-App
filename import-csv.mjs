import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Read environment variables from .env.production or use defaults
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:LCnKdP7Y3lMqhEWP@autorail.proxy.rlwy.net:5432/railway';

console.log('Database URL:', DATABASE_URL ? DATABASE_URL.split('@')[1] : 'not set');

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log('Connected to database');

  // Read CSV file
  const csvPath = 'C:/Users/Rien/Downloads/attendees-import-FINAL.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);

  console.log(`Found ${records.length} records to import`);

  // Prepare values for batch insert
  const attendeesToInsert = [];
  const attendancesToInsert = [];
  let placeholderCounter = 9000000000;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const fullName = row.fullName?.trim() || '';
    let email = row.email?.trim() || '';
    let phoneNumber = row.phoneNumber?.trim() || '';
    const isNewcomer = row.isNewcomer === 'true';
    const month = parseInt(row.month);
    const year = parseInt(row.year);

    if (!fullName) {
      console.log(`Row ${i + 2}: Skipped - missing fullName`);
      continue;
    }

    // Generate placeholder data if missing
    if (!email) {
      email = `placeholder_${fullName.toLowerCase().replace(/\s+/g, '_')}_${i}@placeholder.local`;
    } else {
      email = email.toLowerCase();
    }

    if (!phoneNumber) {
      phoneNumber = String(placeholderCounter++);
    }

    const createdAt = new Date(Date.UTC(year, month - 1, 1));

    attendeesToInsert.push({
      fullName,
      email,
      phoneNumber,
      isNewcomer,
      createdAt,
    });

    attendancesToInsert.push({
      month,
      year,
      fullName,
      email,
      phoneNumber,
    });
  }

  if (attendeesToInsert.length === 0) {
    console.log('No valid records to import');
    process.exit(0);
  }

  // Check for existing attendees
  const result = await client.query('SELECT id, email, phone_number FROM attendees');
  const existingByEmail = new Map(result.rows.filter(r => r.email).map(r => [r.email.toLowerCase(), r.id]));
  const existingByPhone = new Map(result.rows.filter(r => r.phone_number).map(r => [r.phone_number, r.id]));

  // Separate new and existing attendees
  const newAttendees = [];
  const existingIds = [];

  for (const attendee of attendeesToInsert) {
    const existingId = existingByEmail.get(attendee.email.toLowerCase()) || existingByPhone.get(attendee.phoneNumber);
    if (existingId) {
      existingIds.push(existingId);
    } else {
      newAttendees.push(attendee);
    }
  }

  console.log(`Found ${existingIds.length} existing attendees, inserting ${newAttendees.length} new attendees`);

  if (newAttendees.length > 0) {
    // Insert new attendees
    const insertQuery = `
      INSERT INTO attendees (full_name, email, phone_number, is_newcomer, created_at)
      VALUES ${newAttendees.map((_, i) => {
        const offset = i * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(',')}
      RETURNING id, email, phone_number
    `;

    const values = newAttendees.flatMap(a => [a.fullName, a.email, a.phoneNumber, a.isNewcomer, a.createdAt]);

    const insertResult = await client.query(insertQuery, values);
    const newIds = insertResult.rows.map(r => r.id);

    console.log(`Inserted ${newIds.length} new attendees`);

    // Create attendance records for new attendees
    let attendanceInsertIndex = 0;
    for (let i = 0; i < newAttendees.length; i++) {
      const attendee = newAttendees[i];
      const id = newIds[i];
      const attendanceRecord = attendancesToInsert.find(a => a.email.toLowerCase() === attendee.email.toLowerCase());
      if (attendanceRecord) {
        await client.query(
          'INSERT INTO attendances (attendee_id, month, year) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [id, attendanceRecord.month, attendanceRecord.year]
        );
      }
    }

    console.log('Created attendance records for new attendees');
  }

  // Add attendance records for existing attendees
  for (const existingId of existingIds) {
    for (const record of attendancesToInsert) {
      const existingEmail = record.email.toLowerCase();
      const existingById = existingByEmail.get(existingEmail);
      if (existingById === existingId) {
        await client.query(
          'INSERT INTO attendances (attendee_id, month, year) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [existingId, record.month, record.year]
        );
      }
    }
  }

  console.log(`✓ Import complete! ${newAttendees.length} new attendees created, ${existingIds.length} existing attendees updated`);
} catch (error) {
  console.error('Import failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
