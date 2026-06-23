import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  try {
    console.log('Creating email_validation_cache table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_validation_cache (
        email TEXT PRIMARY KEY,
        is_valid BOOLEAN NOT NULL,
        status TEXT NOT NULL,
        validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✓ email_validation_cache table created successfully');
    await pool.end();
  } catch (err) {
    console.error('✗ Error creating table:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();
