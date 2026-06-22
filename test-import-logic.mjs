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

// Test the import logic
console.log('Testing CSV Import Logic\n');
console.log('='.repeat(60));

// Read CSV file
const csvPath = 'C:/Users/Rien/Downloads/attendees-import-FINAL.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);

console.log(`✓ Loaded ${records.length} records from CSV\n`);

// Validate records
let validRecords = 0;
let invalidRecords = 0;
let placeholderCount = 0;
let errors = [];
let placeholderCounter = 9000000000;

for (let i = 0; i < records.length; i++) {
  const row = records[i];
  const fullName = row.fullName?.trim() || '';
  let email = row.email?.trim() || '';
  let phoneNumber = row.phoneNumber?.trim() || '';
  const isNewcomer = row.isNewcomer === 'true' || row.isNewcomer === 'TRUE';
  const month = parseInt(row.month);
  const year = parseInt(row.year);

  // Validate required fields
  if (!fullName) {
    errors.push(`Row ${i + 2}: Missing fullName`);
    invalidRecords++;
    continue;
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    errors.push(`Row ${i + 2}: Invalid month "${row.month}"`);
    invalidRecords++;
    continue;
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    errors.push(`Row ${i + 2}: Invalid year "${row.year}"`);
    invalidRecords++;
    continue;
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`Row ${i + 2}: Invalid email format "${email}"`);
    invalidRecords++;
    continue;
  }

  // Generate placeholder data if missing
  if (!email) {
    email = `placeholder_${fullName.toLowerCase().replace(/\s+/g, '_')}_${i}@placeholder.local`;
    placeholderCount++;
  } else {
    email = email.toLowerCase();
  }

  if (!phoneNumber) {
    phoneNumber = String(placeholderCounter++);
    placeholderCount++;
  }

  validRecords++;
}

console.log('Validation Results:');
console.log(`  ✓ Valid records: ${validRecords}`);
console.log(`  ✗ Invalid records: ${invalidRecords}`);
console.log(`  🔄 With placeholder data: ${placeholderCount}`);

if (errors.length > 0) {
  console.log(`\n⚠️  Errors found (showing first 5):`);
  errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  if (errors.length > 5) {
    console.log(`  ... and ${errors.length - 5} more errors`);
  }
} else {
  console.log(`\n✅ No validation errors!`);
}

// Check boolean values
console.log('\nBoolean Value Check:');
const falseCount = records.filter(r => r.isNewcomer === 'false').length;
const trueCount = records.filter(r => r.isNewcomer === 'true').length;
const badBoolCount = records.filter(r => r.isNewcomer !== 'false' && r.isNewcomer !== 'true').length;

console.log(`  ✓ false: ${falseCount}`);
console.log(`  ✓ true: ${trueCount}`);
if (badBoolCount > 0) {
  console.log(`  ✗ Invalid: ${badBoolCount}`);
}

// Check month/year distribution
console.log('\nMonth/Year Distribution:');
const monthYearMap = new Map();
records.forEach(r => {
  const key = `${r.month}/${r.year}`;
  monthYearMap.set(key, (monthYearMap.get(key) || 0) + 1);
});

Array.from(monthYearMap.entries())
  .sort()
  .forEach(([key, count]) => {
    console.log(`  ${key}: ${count} attendees`);
  });

// Check email statistics
console.log('\nEmail Statistics:');
const realEmails = records.filter(r => r.email && !r.email.match(/^$/));
const emptyEmails = records.filter(r => !r.email || r.email.match(/^$/));
console.log(`  ✓ Real emails: ${realEmails.length}`);
console.log(`  ◯ Empty (will get placeholders): ${emptyEmails.length}`);

// Check phone statistics
console.log('\nPhone Statistics:');
const realPhones = records.filter(r => r.phoneNumber && !r.phoneNumber.match(/^$/));
const emptyPhones = records.filter(r => !r.phoneNumber || r.phoneNumber.match(/^$/));
console.log(`  ✓ Real phones: ${realPhones.length}`);
console.log(`  ◯ Empty (will get auto-generated): ${emptyPhones.length}`);

console.log('\n' + '='.repeat(60));
console.log(`\n✅ Import Logic Test Complete!`);
console.log(`\nReady to import ${validRecords} attendees with proper data validation.`);
