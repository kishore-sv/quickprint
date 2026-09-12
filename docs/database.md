# Database

Single **Neon PostgreSQL** database.

| Area | Migration tool | Tables |
|------|----------------|--------|
| Better Auth | `cd backend && bun run auth:migrate` | `user`, `session`, `account`, `verification`, … |
| Application | Legacy Alembic `001_initial` + `backend/drizzle/*.sql` (additive) | `profiles`, `kiosks`, `saved_files`, `print_jobs`, … |

## ORM

- **Application data:** Drizzle (`backend/src/db/schema/`, `backend/src/db/relations.ts`)
- **Better Auth:** managed by Better Auth CLI (not duplicated in app schema)

## Kiosk tokens

`kiosks.public_token` — secure QR identifier. `kiosk_code` remains human-readable (e.g. `KIOSK-001`). API resolves either.
