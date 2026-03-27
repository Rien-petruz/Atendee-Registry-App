# TNP Attendee Registry App

A full-stack web application for managing church event attendance. Attendees register via a public form, and admins manage records through a protected dashboard.

---

## Features

- **Public registration form** — attendees fill in their details once; returning attendees are automatically recognized and their monthly attendance is recorded without re-registering.
- **Monthly attendance tracking** — each form submission records attendance for the current month/year. Duplicate submissions in the same month are silently ignored.
- **Admin dashboard** — filter, search, sort, and paginate attendee records. Filter by month/year to see who attended a specific month.
- **Bulk email campaigns** — send emails to all, newcomers, or returning attendees, optionally filtered to a specific month's attendance.
- **CSV export** — export attendee records to CSV.
- **SMTP configuration** — configure and test your email delivery settings from the dashboard.

---

## Architecture

```
.
├── artifacts/
│   ├── api-server/          # Express.js REST API (TypeScript)
│   └── event-app/           # React frontend (Vite + Tailwind)
├── lib/
│   ├── api-client-react/    # Generated React Query hooks (orval)
│   ├── api-spec/            # OpenAPI 3.1 spec (openapi.yaml)
│   └── db/                  # Drizzle ORM schema + DB client
└── scripts/                 # Utility scripts
```

**Stack:** TypeScript · Express · React · Drizzle ORM · PostgreSQL · React Query · Tailwind CSS

---

## Database Schema

### `attendees`
Stores a single record per person (identified by email).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `full_name` | text | |
| `email` | text UNIQUE | Lowercased on insert |
| `phone_number` | text | |
| `is_newcomer` | boolean | Set on first registration |
| `created_at` | timestamp | Date of first registration |

### `attendances`
Tracks which month/year each attendee attended. One row per attendee per month.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `attendee_id` | integer FK → attendees | Cascades on delete |
| `month` | integer | 1–12 |
| `year` | integer | e.g. 2026 |
| `attended_at` | timestamp | When the form was submitted |

Unique constraint on `(attendee_id, month, year)` — submitting the form multiple times in the same month records attendance only once.

---

## How Registration Works

1. Attendee fills out the form (name, email, phone, newcomer checkbox).
2. The API looks up the email:
   - **New attendee** — creates an attendee record, then records attendance for the current month. Returns `201`.
   - **Returning attendee** — skips creation, records attendance for the current month (or does nothing if already recorded this month). Returns `200`.
3. Both cases show the success screen on the frontend.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create `.env` files (or set env vars) for the packages that need them:

**`artifacts/api-server/.env`**
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Push database schema

```bash
pnpm --filter @workspace/db push
```

This uses `drizzle-kit push` to apply the schema directly to your database (no migration files).

### Run in development

```bash
# Start API server
pnpm --filter api-server dev

# Start frontend
pnpm --filter event-app dev
```

---

## Admin Access

The dashboard is protected by JWT authentication. Create an admin account directly in the `admins` table, then log in at `/login`.

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/attendees` | — | Register attendee / record attendance |
| GET | `/api/attendees` | Admin | List attendees with filtering/pagination |
| GET | `/api/attendees/export` | Admin | Export attendees as CSV |
| POST | `/api/auth/login` | — | Admin login |
| GET | `/api/auth/me` | Admin | Get current admin |
| GET | `/api/settings/smtp` | Admin | Get SMTP config |
| POST | `/api/settings/smtp` | Admin | Save SMTP config |
| POST | `/api/email/send` | Admin | Send bulk email campaign |
| GET | `/api/email/history` | Admin | Get campaign history |

Full spec: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)
