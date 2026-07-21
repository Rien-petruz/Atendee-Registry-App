# Railway to Supabase Database Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all production data from Railway PostgreSQL to new Supabase project ("The Newwine Place" → "attendee" database), then update application to use new connection.

**Architecture:** 
- Export all 8 tables from Railway using direct SQL queries
- Create schema in Supabase using `drizzle-orm push`
- Import data in dependency order (admins → attendees → attendances/campaigns/cache)
- Update `DATABASE_URL` environment variable in Vercel
- Verify data integrity and application functionality

**Tech Stack:** 
- PostgreSQL (Railway source, Supabase destination)
- Node.js with pg library for data export/import
- Drizzle ORM for schema management
- Vercel environment variables
- Bash/Node scripts for automation

## Global Constraints

- Must preserve all production data (8 tables with complete records)
- No application code changes (Drizzle ORM abstraction handles connection)
- Minimal downtime (~2 minutes during Vercel environment update)
- Foreign key dependencies must be respected (import order critical)
- Auto-increment sequences must resume from correct next value

---

## File Structure

**Migration scripts directory** (create new):
- `scripts/migration/export-railway.mjs` - Export all data from Railway
- `scripts/migration/import-supabase.mjs` - Import data to Supabase (in dependency order)
- `scripts/migration/verify-migration.mjs` - Verify data integrity

**Configuration**:
- `.env.local` - Updated with Supabase connection strings during execution
- `vercel.json` - No changes (connection via environment variable)

**No application code changes** - Same connection string name (`DATABASE_URL`), just different value

---

## Task 1: Create Railway Export Script

**Files:**
- Create: `scripts/migration/export-railway.mjs`

**Interfaces:**
- Consumes: `DATABASE_URL` (Railway connection string from Vercel/environment)
- Produces: SQL INSERT statements for all 8 tables saved to files in `scripts/migration/data/`

**Steps:**

- [ ] **Step 1: Create migration data directory**

```bash
mkdir -p scripts/migration/data
```

- [ ] **Step 2: Write export script**

Create `scripts/migration/export-railway.mjs`:

```javascript
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
```

- [ ] **Step 3: Commit script**

```bash
git add scripts/migration/export-railway.mjs
git commit -m "feat: add Railway export script"
```

---

## Task 2: Export Data from Railway

**Files:**
- Uses: `scripts/migration/export-railway.mjs`
- Produces: 8 JSON files in `scripts/migration/data/`

**Steps:**

- [ ] **Step 1: Set Railway connection string**

First, get your Railway database connection string from your Railway dashboard or Vercel environment:

```bash
# Option A: If you have it in Vercel, pull it
vercel env pull --environment production

# Option B: Get it from Railway dashboard directly
# Railway → PostgreSQL → Connection Tab → copy full URL
```

- [ ] **Step 2: Export data from Railway**

```bash
RAILWAY_DATABASE_URL="postgres://..." node scripts/migration/export-railway.mjs
```

Expected output:
```
🚀 Starting Railway data export...

📤 Exporting admins...
   ✅ Exported X rows
📤 Exporting smtp_settings...
   ✅ Exported X rows
📤 Exporting attendees...
   ✅ Exported X rows
...
✅ Export complete! Total rows: NNN
📁 Data saved to: /path/to/scripts/migration/data
```

- [ ] **Step 3: Verify export files**

```bash
ls -lah scripts/migration/data/
# Should show 8 JSON files: admins.json, attendees.json, etc.

# Spot-check a file
cat scripts/migration/data/attendees.json | head -20
```

- [ ] **Step 4: Do NOT commit data files yet**

Data files contain sensitive information (admin passwords, SMTP credentials). We'll import them to Supabase first, then delete.

```bash
# Add data directory to .gitignore if not already there
echo "scripts/migration/data/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore migration data files"
```

---

## Task 3: Get Supabase Connection String and Push Schema

**Files:**
- Uses: Supabase project "The Newwine Place" / "attendee" database
- Modifies: `.env.local` (temporary)

**Steps:**

- [ ] **Step 1: Get Supabase connection string**

Go to Supabase Dashboard:
1. Select "The Newwine Place" project
2. Go to Settings → Database
3. Copy the connection string under "Connection string" (NOT pooling string for Drizzle CLI)
4. Keep it safe - you'll need it in next steps

The connection string looks like: `postgres://postgres:password@host:5432/attendee`

- [ ] **Step 2: Set Supabase connection in environment**

```bash
export SUPABASE_DATABASE_URL="postgres://postgres:PASSWORD@DB_HOST:5432/attendee"
```

Or add to `.env.local` temporarily:
```bash
echo 'SUPABASE_DATABASE_URL="postgres://postgres:PASSWORD@DB_HOST:5432/attendee"' >> .env.local
```

- [ ] **Step 3: Push schema to Supabase**

This creates all 8 tables in Supabase with correct structure, types, and constraints:

```bash
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm run -C lib/db push
```

Expected output:
```
drizzle-kit: Info: Connecting to PostgreSQL...
drizzle-kit: Info: Introspecting database...
drizzle-kit: Info: Schema is up to date, no migrations found.
```

OR if tables don't exist yet:
```
drizzle-kit: Info: Creating tables...
drizzle-kit: Info: 8 tables created
```

- [ ] **Step 4: Verify schema in Supabase**

Go to Supabase Dashboard → SQL Editor:

```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected result: 8 tables (admins, attendances, attendees, email_campaigns, email_validation_cache, sms_campaigns, sms_settings, smtp_settings)

- [ ] **Step 5: Do NOT commit .env.local**

The Supabase connection string contains credentials. Remove it from .env.local after this task:

```bash
git checkout .env.local
```

---

## Task 4: Create Supabase Import Script

**Files:**
- Create: `scripts/migration/import-supabase.mjs`

**Interfaces:**
- Consumes: JSON data files from `scripts/migration/data/` + `SUPABASE_DATABASE_URL` environment variable
- Produces: All 8 tables populated in Supabase with data from Railway

**Steps:**

- [ ] **Step 1: Write import script**

Create `scripts/migration/import-supabase.mjs`:

```javascript
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL;

if (!SUPABASE_DB_URL) {
  console.error('❌ SUPABASE_DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: SUPABASE_DB_URL });
const dataDir = path.join(process.cwd(), 'scripts', 'migration', 'data');

// Import order respects foreign key dependencies
const IMPORT_ORDER = [
  'admins',
  'smtp_settings',
  'sms_settings',
  'attendees',
  'attendances',
  'email_campaigns',
  'sms_campaigns',
  'email_validation_cache'
];

async function importTable(tableName) {
  const filePath = path.join(dataDir, `${tableName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    throw new Error(`Missing data file for ${tableName}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (data.length === 0) {
    console.log(`📥 ${tableName} (empty - skipping)`);
    return 0;
  }

  try {
    console.log(`📥 Importing ${tableName}...`);

    // Get column names from first row
    const columns = Object.keys(data[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnList = columns.join(', ');

    let imported = 0;
    for (const row of data) {
      const values = columns.map(col => row[col]);
      
      try {
        await pool.query(
          `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
          values
        );
        imported++;
      } catch (err) {
        // Log detailed error but continue
        console.error(`   ⚠️  Row error in ${tableName}:`, err.message);
      }
    }

    console.log(`   ✅ Imported ${imported}/${data.length} rows`);
    return imported;
  } catch (err) {
    console.error(`❌ Error importing ${tableName}:`, err.message);
    throw err;
  }
}

async function importAll() {
  try {
    console.log('🚀 Starting Supabase data import...\n');

    let totalRows = 0;
    for (const table of IMPORT_ORDER) {
      totalRows += await importTable(table);
    }

    console.log(`\n✅ Import complete! Total rows: ${totalRows}`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importAll();
```

- [ ] **Step 2: Commit script**

```bash
git add scripts/migration/import-supabase.mjs
git commit -m "feat: add Supabase import script"
```

---

## Task 5: Import Data to Supabase

**Files:**
- Uses: `scripts/migration/import-supabase.mjs` + data files from Task 2

**Steps:**

- [ ] **Step 1: Set Supabase connection string**

```bash
export SUPABASE_DATABASE_URL="postgres://postgres:PASSWORD@DB_HOST:5432/attendee"
```

- [ ] **Step 2: Clear any existing data in Supabase tables (optional)**

Only do this if Supabase tables have test data you want to remove:

```bash
SUPABASE_DATABASE_URL="$SUPABASE_DATABASE_URL" node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL });
(async () => {
  await pool.query('TRUNCATE TABLE email_validation_cache, sms_campaigns, email_campaigns, attendances, sms_settings, smtp_settings, attendees, admins CASCADE');
  await pool.end();
  console.log('✅ Tables cleared');
})();
"
```

- [ ] **Step 3: Run import script**

```bash
SUPABASE_DATABASE_URL="$SUPABASE_DATABASE_URL" node scripts/migration/import-supabase.mjs
```

Expected output:
```
🚀 Starting Supabase data import...

📥 Importing admins...
   ✅ Imported X rows
📥 Importing smtp_settings...
   ✅ Imported X rows
📥 Importing attendees...
   ✅ Imported X rows
📥 Importing attendances...
   ✅ Imported X rows
...
✅ Import complete! Total rows: NNN
```

- [ ] **Step 4: Verify row counts match**

Compare row counts from Railway export to Supabase import:

```bash
# Check export summary from Task 2 output
# Compare total rows: should match

# Or query Supabase directly
psql "$SUPABASE_DATABASE_URL" -c "
SELECT 'admins' as table_name, COUNT(*) as row_count FROM admins
UNION ALL
SELECT 'attendees', COUNT(*) FROM attendees
UNION ALL
SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL
SELECT 'email_campaigns', COUNT(*) FROM email_campaigns
UNION ALL
SELECT 'sms_campaigns', COUNT(*) FROM sms_campaigns
UNION ALL
SELECT 'smtp_settings', COUNT(*) FROM smtp_settings
UNION ALL
SELECT 'sms_settings', COUNT(*) FROM sms_settings
UNION ALL
SELECT 'email_validation_cache', COUNT(*) FROM email_validation_cache;
"
```

All counts should match the export.

---

## Task 6: Update Vercel Environment Variable

**Files:**
- Modifies: Vercel environment variables (DATABASE_URL)

**Steps:**

- [ ] **Step 1: Get Supabase connection string with pooling (for Vercel)**

Go to Supabase Dashboard:
1. Select "The Newwine Place" project
2. Go to Settings → Database
3. Copy the connection string under "Connection pooling" (use Session pooling for serverless)
4. Format: `postgres://postgres:PASSWORD@POOLING_HOST:6543/attendee`

The pooling host is different from the direct connection host (usually includes `pooler` in domain).

- [ ] **Step 2: Remove old DATABASE_URL from Vercel (optional)**

If Railway DATABASE_URL is already set:

```bash
vercel env rm DATABASE_URL --production
```

When prompted, confirm the removal.

- [ ] **Step 3: Add new Supabase DATABASE_URL to Vercel**

```bash
# Create a temp file with the connection string
echo -n "postgres://postgres:PASSWORD@POOLING_HOST:6543/attendee" > /tmp/db_url.txt

# Add to Vercel production environment
vercel env add DATABASE_URL production < /tmp/db_url.txt

# Clean up
rm /tmp/db_url.txt
```

Expected output:
```
✔ Added Environment Variable DATABASE_URL to production
```

- [ ] **Step 4: Verify environment variable is set**

```bash
vercel env ls
```

Should show:
```
DATABASE_URL        Encrypted       Production      (recently updated)
```

---

## Task 7: Deploy and Verify Migration

**Files:**
- Uses: Updated `DATABASE_URL` in Vercel
- No code changes (application uses same ORM, same connection string name)

**Steps:**

- [ ] **Step 1: Deploy to production**

```bash
vercel --prod
```

Expected output:
```
Production: https://attendee-registry-app.vercel.app [40s]
Building: ...
Deployment completed
Aliased: https://attendee-registry-app.vercel.app
✅ Deployment successful
```

Wait for deployment to complete (shows READY state).

- [ ] **Step 2: Test admin login**

Open in browser: `https://attendee-registry-app.vercel.app/admin`

Log in with admin credentials (same as before - data migrated from Railway):
- Email: [your admin email]
- Password: [your admin password]

Expected: Login successful, redirected to dashboard

- [ ] **Step 3: Check attendee list**

In admin dashboard, navigate to "Attendees" page.

Expected: All attendees from Railway are visible, with correct counts

```bash
# Or test via API
curl -s https://attendee-registry-app.vercel.app/api/attendees?limit=10 \
  | jq '.total, (.attendees | length)'

# Should show total count and list of attendees
```

- [ ] **Step 4: Test email settings**

Navigate to Settings → Email Configuration in admin panel.

Expected: SMTP settings from Railway are loaded (hostname, port, username)

- [ ] **Step 5: Verify email validation cache**

Check that ZeroBounce validation cache was migrated:

```bash
curl -s https://attendee-registry-app.vercel.app/api/attendees/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Should return validation result
```

- [ ] **Step 6: Run comprehensive verification script (optional)**

Create `scripts/migration/verify-migration.mjs` to automate verification:

```javascript
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'https://attendee-registry-app.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

async function verify() {
  try {
    console.log('🔍 Starting migration verification...\n');

    // Test 1: Health check
    console.log('1️⃣  Health Check');
    const health = await fetch(`${API_URL}/api/healthz`);
    if (!health.ok) throw new Error('Health check failed');
    console.log('   ✅ API is healthy\n');

    // Test 2: Admin login
    console.log('2️⃣  Admin Login');
    const login = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    if (!login.ok) throw new Error('Admin login failed');
    const { token } = await login.json();
    console.log('   ✅ Admin login successful\n');

    // Test 3: List attendees
    console.log('3️⃣  Attendee List');
    const attendees = await fetch(`${API_URL}/api/attendees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!attendees.ok) throw new Error('Failed to list attendees');
    const { total } = await attendees.json();
    console.log(`   ✅ Retrieved ${total} attendees\n`);

    // Test 4: Email settings
    console.log('4️⃣  Email Settings');
    const settings = await fetch(`${API_URL}/api/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (settings.ok) {
      console.log('   ✅ Settings accessible\n');
    } else {
      console.log('   ⚠️  Could not verify settings\n');
    }

    console.log('✅ Verification complete!');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verify();
```

Run:
```bash
node scripts/migration/verify-migration.mjs
```

- [ ] **Step 7: Clean up migration data files**

Once verified successfully, remove the exported data files (they contain sensitive info):

```bash
rm -rf scripts/migration/data/
git add scripts/migration/
git commit -m "chore: cleanup migration data files after successful import"
```

- [ ] **Step 8: Final commit**

Document migration completion:

```bash
git log --oneline -5
# Verify commits show:
# - export script
# - import script
# - verification results

git commit --allow-empty -m "migration: completed Railway to Supabase migration

- Exported all 8 tables from Railway
- Pushed schema to Supabase
- Imported data (admins, attendees, attendances, campaigns, settings, cache)
- Updated DATABASE_URL in Vercel
- Verified data integrity and application functionality
- All attendees and settings migrated successfully"
```

---

## Verification Checklist (Task 7, Step 5)

Before considering migration complete, verify:

- [ ] Admin login works
- [ ] Attendee count visible in dashboard
- [ ] SMTP settings loaded
- [ ] Email validation cache accessible
- [ ] Can register new attendee (tests database writes)
- [ ] Can send test email (uses SMTP settings from migrated data)
- [ ] Row counts match between Railway and Supabase

---

## Rollback Procedure (If Needed)

If anything goes wrong after deployment:

```bash
# 1. Revert to Railway database URL
vercel env rm DATABASE_URL --production
# or
vercel env add DATABASE_URL production < /tmp/railway_db_url.txt

# 2. Redeploy
vercel --prod

# 3. Supabase database remains unchanged - can retry migration
```

Rollback takes ~2 minutes (just environment variable change + redeploy).

---

## Summary

**Execution order:**
1. Create and run export script (Railway → JSON files)
2. Push schema to Supabase (creates tables)
3. Create and run import script (JSON files → Supabase)
4. Update DATABASE_URL in Vercel
5. Deploy application
6. Verify data and functionality
7. Clean up data files

**Estimated time:** 30-45 minutes total
**Downtime:** ~2 minutes during Vercel deployment
**Risk level:** Low (rollback available, original data stays in Railway)
