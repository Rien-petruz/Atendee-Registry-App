# Event Attendee App

## Overview

A full-stack event attendee management platform with a public registration page, premium admin dashboard, segmented bulk emailing, and configurable Gmail SMTP — secured with JWT authentication.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, framer-motion)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: JWT (jsonwebtoken + bcrypt)
- **Email**: Nodemailer (dynamic SMTP configured via admin panel)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Default Admin Credentials

- **Email**: `admin@example.com`
- **Password**: `admin123`

> Change these in production! Run the seed script to create a new admin.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/routes/     # auth, attendees, settings, email
│   │   ├── src/middleware/ # JWT auth middleware
│   │   ├── src/services/   # emailService (Nodemailer)
│   │   └── src/lib/        # crypto (AES-256 encryption for SMTP pw)
│   └── event-app/          # React + Vite frontend
│       └── src/pages/      # register, login, dashboard, settings, email
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/
│       └── src/schema/     # admins, attendees, smtp_settings
└── scripts/
    └── src/seed-admin.ts   # Creates default admin user
```

## Key Features

- **Public Registration**: `/register` — form with fullName, email, phone, newcomer toggle
- **Admin Login**: `/login` — JWT auth, stored in localStorage
- **Dashboard**: `/dashboard` — searchable, filterable, sortable attendee table + stats cards + CSV export
- **SMTP Settings**: `/settings` — configurable Gmail SMTP, password encrypted with AES-256
- **Bulk Email**: `/email` — segmented sending (all/newcomers/returning), `{{name}}` / `{{email}}` placeholders

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | - | Admin login |
| GET | /api/auth/me | JWT | Current admin |
| POST | /api/attendees | - | Register attendee |
| GET | /api/attendees | JWT | List attendees (search/filter/sort/paginate) |
| GET | /api/attendees/export | JWT | Export CSV |
| GET | /api/settings/smtp | JWT | Get SMTP settings |
| POST | /api/settings/smtp | JWT | Save SMTP settings |
| POST | /api/settings/smtp/test | JWT | Test SMTP connection |
| POST | /api/email/send | JWT | Send bulk email |

## Security

- Passwords hashed with bcrypt (salt rounds: 12)
- JWT signed with `JWT_SECRET` env var (defaults to dev secret)
- SMTP passwords encrypted with AES-256-CBC, key from `ENCRYPTION_KEY` env var
- Public endpoints: only `/api/attendees` POST and `/api/auth/login`
- All admin routes protected with `requireAuth` middleware

## Environment Variables

- `DATABASE_URL` — auto-provided by Replit PostgreSQL
- `JWT_SECRET` — JWT signing secret (set in production)
- `ENCRYPTION_KEY` — 32-char key for SMTP password encryption (set in production)
- `PORT` — auto-assigned by Replit

## Seeding

```bash
pnpm --filter @workspace/scripts run seed-admin
# Creates admin@example.com / admin123
```

## Codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```
