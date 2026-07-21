import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DB_URL) {
  console.error('❌ RAILWAY_DATABASE_URL or DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: RAILWAY_DB_URL });
const dataDir = path.join(process.cwd(), 'scripts', 'migration', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function exportTable(tableName) {
  try {
    console.log(`📤 Exporting ${tableName}...`);
    const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);

    if (result.rows.length === 0) {
      console.log(`   (empty table)`);
      fs.writeFileSync(path.join(dataDir, `${tableName}.json`), JSON.stringify([], null, 2));
      return 0;
    }

    // Get column names
    const columns = Object.keys(result.rows[0]);

    // Save as JSON for easier manipulation
    fs.writeFileSync(
      path.join(dataDir, `${tableName}.json`),
      JSON.stringify(result.rows, null, 2)
    );

    console.log(`   ✅ Exported ${result.rows.length} rows`);
    return result.rows.length;
  } catch (err) {
    console.error(`❌ Error exporting ${tableName}:`, err.message);
    throw err;
  }
}

async function exportAll() {
  try {
    console.log('🚀 Starting Railway data export...\n');

    const tables = [
      'admins',
      'smtp_settings',
      'sms_settings',
      'attendees',
      'attendances',
      'email_campaigns',
      'sms_campaigns',
      'email_validation_cache'
    ];

    let totalRows = 0;
    for (const table of tables) {
      totalRows += await exportTable(table);
    }

    console.log(`\n✅ Export complete! Total rows: ${totalRows}`);
    console.log(`📁 Data saved to: ${dataDir}`);
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

exportAll();
