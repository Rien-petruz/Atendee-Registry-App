---
title: Railway to Supabase Database Migration
date: 2026-07-21
status: approved
---

# Railway to Supabase Database Migration Design

## Overview

Migrate all production data from Railway PostgreSQL to a new Supabase project ("The Newwine Place" → "attendee" database). The existing application code requires no changes; only the database connection URL changes.

**Timeline**: ~5-10 minutes execution time
**Downtime**: ~2 minutes during Vercel environment variable update and redeployment

## Current State

**Source**: Railway PostgreSQL (production database)
**Data to migrate**: 8 tables with production records
- `admins` - Admin user accounts
- `attendees` - Event attendee records
- `attendances` - Monthly attendance records
- `email_campaigns` - Email campaign history
- `sms_campaigns` - SMS campaign history
- `smtp_settings` - Email server configuration
- `sms_settings` - SMS server configuration
- `email_validation_cache` - ZeroBounce validation results

**Destination**: Supabase project "The Newwine Place" database "attendee" (already created by user)

## Migration Strategy

### Phase 1: Data Export (Railway)
Export all data from Railway tables using SQL queries or `pg_dump`:
- Extract all records from each table
- Preserve order (respect foreign key dependencies: attendances depends on attendees, campaigns depend on attendees)
- Save as SQL INSERT statements or CSV files

### Phase 2: Schema Preparation (Supabase)
Create database schema in Supabase using Drizzle ORM:
- Run `pnpm run -C lib/db push` against new Supabase connection
- This creates all 8 tables with correct structure, types, and constraints
- Ensures consistency between Railway and Supabase schemas

### Phase 3: Data Import (Supabase)
Insert exported data into Supabase tables:
- Import in dependency order: admins → attendees → attendances, campaigns, etc.
- Verify row counts match between source and destination
- Verify foreign key constraints are satisfied

### Phase 4: Configuration Update (Vercel)
Update application to use new Supabase connection:
- Set `DATABASE_URL` environment variable in Vercel to new Supabase connection string
- Redeploy application to pick up new connection string

### Phase 5: Verification (Production)
Confirm migration success:
- Test admin login (verifies `admins` table)
- List attendees (verifies `attendees` table)
- Check email campaigns (verifies `email_campaigns` table)
- Verify SMTP settings are accessible (verifies `smtp_settings` table)

## Data Integrity Guarantees

✅ **No data loss** - All records from Railway are copied to Supabase
✅ **Referential integrity** - Foreign keys preserved (attendances linked to attendees, etc.)
✅ **Sequence continuity** - Auto-increment IDs resume from correct next value
✅ **Settings preserved** - Admin accounts, email/SMS configuration unchanged
✅ **Cache preserved** - ZeroBounce validation cache migrated (avoids re-validation)

## Implementation Details

### Table Dependencies (Import Order)
1. `admins` - No dependencies
2. `smtp_settings`, `sms_settings` - No dependencies
3. `attendees` - No dependencies
4. `attendances` - Depends on `attendees` (foreign key)
5. `email_campaigns`, `sms_campaigns` - Depend on `attendees` (foreign key)
6. `email_validation_cache` - No dependencies

### Verification Steps
- Row count comparison: `SELECT COUNT(*) FROM [table]` on both databases
- Data sample comparison: Spot-check random records
- Foreign key validation: Attempt insert/update/delete to verify constraints work
- Application test: Login, view attendees, send test email

## Rollback Plan

If migration fails:
1. Revert `DATABASE_URL` in Vercel to point back to Railway
2. Redeploy (immediate rollback, takes ~2 minutes)
3. Supabase database remains unchanged (can re-attempt migration)

## Success Criteria

✅ All 8 tables successfully migrated to Supabase
✅ Row counts match between Railway and Supabase
✅ Foreign key relationships intact
✅ Application connects to Supabase without errors
✅ Admin login works
✅ Attendee list displays correctly
✅ Email sending (uses SMTP settings from migrated data) works

## No Application Code Changes Required

The existing application code is database-agnostic (uses Drizzle ORM). Only the connection string changes:
- Same schema definition (`lib/db/src/schema/*`)
- Same ORM queries (no changes to `artifacts/api-server/src/routes/*`)
- Same environment variable name (`DATABASE_URL`)
