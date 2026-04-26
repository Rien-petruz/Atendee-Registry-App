# Deployment & Database Setup Guide

## Issues Fixed

### 1. **Database Connection Pooling** ✅
- Updated connection pool configuration to work with Vercel's serverless environment
- Set max connections to 1 and proper timeout values
- Location: `lib/db/src/index.ts`

### 2. **Vercel Configuration** ✅
- Updated `vercel.json` with proper function configuration
- Added memory and timeout settings for API function
- Configured proper rewrites for API routes
- Added cache control headers for API endpoints

### 3. **Express App Configuration** ✅
- Enhanced error logging in production
- Added health check endpoint at root `/`
- Improved error handling for serverless context

### 4. **Database Configuration** ✅
- Updated `drizzle.config.ts` to handle multiple environment variable names
- Supports: DATABASE_URL, POSTGRES_URL, STORAGE_POSTGRES_URL, STORAGE_POSTGRES_PRISMA_URL

## Setup Instructions

### Step 1: Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your database connection string from:
   - Settings → Database → Connection Pooling (recommended for Vercel)
   - Or Connection String (standard connection)

### Step 2: Initialize Database Schema

Run the following command locally to create the database tables in your Supabase database:

```bash
# Set your database connection string
export DATABASE_URL="your_supabase_connection_string"

# Run the migration to create tables
pnpm run -C lib/db push
```

This will create these tables:
- `admins` - Admin user accounts
- `attendees` - Event attendees information
- `attendances` - Attendance records by month/year
- `smtp_settings` - Email configuration
- `email_campaigns` - Email campaign records

### Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project settings
2. Add these environment variables:

**Required:**
- `DATABASE_URL` - Your Supabase connection string (use pooled connection for serverless)
- `ADMIN_EMAIL` - Admin email for initial account (e.g., `admin@example.com`)
- `ADMIN_PASSWORD` - Admin password (can be changed after login)
- `JWT_SECRET` - Secret key for JWT tokens (generate a random string: `openssl rand -base64 32`)

**Optional:**
- `NODE_ENV` - Set to `production` (automatically set by Vercel)
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email account
- `SMTP_PASSWORD` - Email password

### Step 4: Deploy to Vercel

Push your changes to your git repository:

```bash
git add .
git commit -m "Fix deployment and database configuration"
git push
```

Vercel will automatically trigger a new deployment. Check the deployment logs to ensure:
1. Build succeeds: `pnpm run build`
2. No database connection errors
3. Admin user is seeded successfully

### Step 5: Test the Deployment

1. Visit your Vercel deployment URL
2. Login with your admin credentials (ADMIN_EMAIL and ADMIN_PASSWORD)
3. Try registering a new attendee
4. Verify data appears in the attendees list
5. Check your Supabase dashboard - data should be stored in the `attendees` table

## Troubleshooting

### Database Connection Errors

**Error: "CRITICAL: Database connection string not found"**
- Solution: Ensure DATABASE_URL is set in Vercel environment variables
- Check that the connection string is valid and accessible

**Error: "connect ECONNREFUSED" or timeout**
- Solution: Use Supabase's pooled connection string instead of direct connection
- Location: Supabase → Settings → Database → Connection Pooling

### Data Not Being Saved

1. Check Vercel deployment logs for database errors
2. Verify DATABASE_URL is correctly set
3. Verify database tables exist: `SELECT * FROM attendees;` in Supabase SQL editor
4. Check if tables need to be created: run `pnpm run -C lib/db push` again

### Admin Login Issues

1. Verify ADMIN_EMAIL and ADMIN_PASSWORD are set in Vercel
2. Check that the `admins` table exists in your database
3. View the deployment logs - admin seeding logs will show if seeding succeeded

### API Not Responding

1. Check that `/api/healthz` returns `{"status":"ok"}`
2. Verify the API is deployed as a Vercel function
3. Check Vercel function logs for errors
4. Ensure all dependencies are installed: `pnpm install`

## Database Schema Reference

### admins table
```
id: serial primary key
email: text (unique)
passwordHash: text
createdAt: timestamp
```

### attendees table
```
id: serial primary key
fullName: text
email: text (unique)
phoneNumber: text
isNewcomer: boolean (default: false)
createdAt: timestamp
```

### attendances table
```
id: serial primary key
attendeeId: integer (references admins)
month: integer (1-12)
year: integer
attendedAt: timestamp
unique constraint: (attendeeId, month, year)
```

## API Endpoints

### Public Endpoints
- `POST /api/attendees` - Register new attendee
- `GET /api/healthz` - Health check
- `GET /` - Root health check

### Protected Endpoints (requires JWT token)
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin info
- `GET /api/attendees` - List attendees (with filtering)
- `GET /api/attendees/export` - Export attendees as CSV
- `GET /api/settings` - Get settings
- `POST /api/email` - Send emails
- `GET /api/email/status` - Get email campaign status

## Next Steps

1. ✅ Fixed code - ready for deployment
2. → Set up Supabase database
3. → Initialize schema with `pnpm run -C lib/db push`
4. → Set environment variables in Vercel
5. → Trigger new deployment
6. → Test the application

For any issues, check the deployment logs in Vercel or contact Supabase support for database-specific issues.
