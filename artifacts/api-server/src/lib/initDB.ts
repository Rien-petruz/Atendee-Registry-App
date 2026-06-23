import { pool } from "@workspace/db";

export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");

    // Create email_validation_cache table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_validation_cache (
        email TEXT PRIMARY KEY,
        is_valid BOOLEAN NOT NULL,
        status TEXT NOT NULL,
        validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("✓ email_validation_cache table initialized");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}
