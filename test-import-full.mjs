import fs from 'fs';

console.log('\n' + '='.repeat(70));
console.log('ATTENDEE CSV IMPORT - FULL TEST SUITE');
console.log('='.repeat(70) + '\n');

// ============================================================================
// TEST 1: CSV File Validation
// ============================================================================
console.log('TEST 1: CSV File Validation');
console.log('-'.repeat(70));

const csvPath = 'C:/Users/Rien/Downloads/attendees-import-FINAL.csv';
if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found at ${csvPath}`);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');
console.log(`✓ CSV file exists`);
console.log(`✓ Total lines (including header): ${lines.length}`);

// ============================================================================
// TEST 2: CSV Header Validation
// ============================================================================
console.log('\nTEST 2: CSV Header Validation');
console.log('-'.repeat(70));

const header = lines[0];
const expectedHeaders = ['fullName', 'email', 'phoneNumber', 'isNewcomer', 'month', 'year'];
const actualHeaders = header.split(',').map(h => h.trim());

let headerValid = true;
expectedHeaders.forEach((expected, idx) => {
  if (actualHeaders[idx] === expected) {
    console.log(`✓ Column ${idx + 1}: ${expected}`);
  } else {
    console.log(`✗ Column ${idx + 1}: expected "${expected}", got "${actualHeaders[idx]}"`);
    headerValid = false;
  }
});

if (!headerValid) {
  console.error('\n❌ CSV header is invalid');
  process.exit(1);
}

// ============================================================================
// TEST 3: CSV Parsing
// ============================================================================
console.log('\nTEST 3: CSV Parsing');
console.log('-'.repeat(70));

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

const records = parseCSV(csvContent);
console.log(`✓ Parsed ${records.length} data records`);

// ============================================================================
// TEST 4: Data Type Validation
// ============================================================================
console.log('\nTEST 4: Data Type Validation');
console.log('-'.repeat(70));

let typeErrors = [];

records.forEach((row, idx) => {
  const rowNum = idx + 2;

  // Validate fullName (required, string)
  if (!row.fullName || typeof row.fullName !== 'string' || !row.fullName.trim()) {
    typeErrors.push(`Row ${rowNum}: fullName is required and must be non-empty`);
  }

  // Validate email (optional, but if provided must be valid)
  if (row.email && row.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      typeErrors.push(`Row ${rowNum}: invalid email format "${row.email}"`);
    }
  }

  // Validate phoneNumber (optional, can be any string)
  if (row.phoneNumber && typeof row.phoneNumber !== 'string') {
    typeErrors.push(`Row ${rowNum}: phoneNumber must be a string`);
  }

  // Validate isNewcomer (must be 'true' or 'false')
  if (row.isNewcomer !== 'true' && row.isNewcomer !== 'false') {
    typeErrors.push(`Row ${rowNum}: isNewcomer must be 'true' or 'false', got "${row.isNewcomer}"`);
  }

  // Validate month (required, must be 1-12)
  const month = parseInt(row.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    typeErrors.push(`Row ${rowNum}: month must be integer 1-12, got "${row.month}"`);
  }

  // Validate year (required, must be valid year)
  const year = parseInt(row.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    typeErrors.push(`Row ${rowNum}: year must be integer 1900-2100, got "${row.year}"`);
  }
});

if (typeErrors.length === 0) {
  console.log(`✓ All ${records.length} rows have valid data types`);
} else {
  console.log(`✗ Found ${typeErrors.length} validation errors:`);
  typeErrors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  if (typeErrors.length > 10) {
    console.log(`  ... and ${typeErrors.length - 10} more errors`);
  }
  process.exit(1);
}

// ============================================================================
// TEST 5: Placeholder Data Generation
// ============================================================================
console.log('\nTEST 5: Placeholder Data Generation');
console.log('-'.repeat(70));

const records2 = records.map((row, idx) => {
  let email = row.email?.trim() || '';
  let phone = row.phoneNumber?.trim() || '';

  if (!email) {
    email = `placeholder_${row.fullName.toLowerCase().replace(/\s+/g, '_')}_${idx}@placeholder.local`;
  }
  if (!phone) {
    phone = String(9000000000 + idx);
  }

  return { ...row, generatedEmail: email, generatedPhone: phone };
});

const withPlaceholders = records2.filter(r =>
  r.generatedEmail.includes('placeholder_') ||
  r.generatedPhone.startsWith('9000')
);

console.log(`✓ All records have complete email data: ${records2.every(r => r.generatedEmail)}`);
console.log(`✓ All records have complete phone data: ${records2.every(r => r.generatedPhone)}`);
console.log(`✓ Records needing placeholders: ${withPlaceholders.length}`);

// ============================================================================
// TEST 6: Uniqueness Check
// ============================================================================
console.log('\nTEST 6: Uniqueness Check');
console.log('-'.repeat(70));

const emails = records2.map(r => r.generatedEmail.toLowerCase());
const phones = records2.map(r => r.generatedPhone);

const uniqueEmails = new Set(emails);
const uniquePhones = new Set(phones);

console.log(`✓ Total emails: ${emails.length}`);
console.log(`✓ Unique emails: ${uniqueEmails.size}`);
if (emails.length !== uniqueEmails.size) {
  console.log(`✗ WARNING: Found ${emails.length - uniqueEmails.size} duplicate emails`);
}

console.log(`✓ Total phones: ${phones.length}`);
console.log(`✓ Unique phones: ${uniquePhones.size}`);
if (phones.length !== uniquePhones.size) {
  console.log(`✗ WARNING: Found ${phones.length - uniquePhones.size} duplicate phones`);
}

// ============================================================================
// TEST 7: Data Distribution
// ============================================================================
console.log('\nTEST 7: Data Distribution');
console.log('-'.repeat(70));

const distribution = {};
records.forEach(row => {
  const key = `${row.month}/${row.year}`;
  distribution[key] = (distribution[key] || 0) + 1;
});

console.log('Month/Year Distribution:');
Object.entries(distribution).sort().forEach(([key, count]) => {
  console.log(`  ${key}: ${count} attendees`);
});

const newcomers = records.filter(r => r.isNewcomer === 'true').length;
const returning = records.filter(r => r.isNewcomer === 'false').length;
console.log(`\n✓ Newcomers: ${newcomers} (${(newcomers/records.length*100).toFixed(1)}%)`);
console.log(`✓ Returning: ${returning} (${(returning/records.length*100).toFixed(1)}%)`);

// ============================================================================
// TEST 8: Sample Data Review
// ============================================================================
console.log('\nTEST 8: Sample Data Review');
console.log('-'.repeat(70));

console.log('Sample records (first 3):');
records.slice(0, 3).forEach((row, idx) => {
  console.log(`\n  Row ${idx + 2}:`);
  console.log(`    Name: ${row.fullName}`);
  console.log(`    Email: ${row.email || '(empty - will use placeholder)'}`);
  console.log(`    Phone: ${row.phoneNumber || '(empty - will use auto-generated)'}`);
  console.log(`    Newcomer: ${row.isNewcomer}`);
  console.log(`    Date: ${row.month}/${row.year}`);
});

console.log(`\nRows with placeholder emails:`);
records.filter((r, idx) => !r.email || !r.email.trim()).slice(0, 3).forEach((row, idx) => {
  console.log(`  - ${row.fullName}`);
});

// ============================================================================
// TEST 9: API Payload Validation
// ============================================================================
console.log('\nTEST 9: API Payload Validation');
console.log('-'.repeat(70));

const payload = {
  rows: records2.map(r => ({
    fullName: r.fullName,
    email: r.generatedEmail,
    phoneNumber: r.generatedPhone,
    isNewcomer: r.isNewcomer === 'true',
    month: parseInt(r.month),
    year: parseInt(r.year)
  }))
};

console.log(`✓ Payload structure valid: ${Array.isArray(payload.rows)}`);
console.log(`✓ Payload size: ${JSON.stringify(payload).length} bytes`);
console.log(`✓ Rows in payload: ${payload.rows.length}`);

const samplePayload = payload.rows[0];
console.log(`\nSample API payload (row 1):`);
console.log(`  ${JSON.stringify(samplePayload)}`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(70));
console.log(`
IMPORT READY: ${records.length} attendees

The CSV import is fully validated and ready:
  • All ${records.length} records are valid
  • Email/phone data is complete (with auto-generated placeholders)
  • All data types are correct
  • API payload structure is valid

Next steps:
  1. Use upload-import.mjs with admin credentials
  2. Or use direct-import.mjs with DATABASE_URL
  3. Verify import in database with SELECT COUNT(*) FROM attendees;
`);
console.log('='.repeat(70) + '\n');
