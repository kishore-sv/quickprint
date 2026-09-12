# Backend rewrite — final report

## 1. Previous architecture

FastAPI + SQLAlchemy + Alembic (removed). Better Auth was briefly on Next.js; now on Express.

## 2. Current architecture

Bun + Express + Drizzle (`pg`) + Better Auth + Supabase S3 + Razorpay. Next.js UI-only client.

## 3. Removed

- Python FastAPI backend (`backend-fastapi/`)
- Next.js `/api/auth` route and `pg` on client

## 4. Added

- Full TypeScript backend under `backend/`
- Split Drizzle schema + relations
- Wrapped API responses `{ success, data }`
- Kiosk session enforcement on release
- `DocumentConversionService` stub, retention cleanup script
- Expanded unit tests

## 5. Database schema

Application tables: `profiles`, `kiosks`, `kiosk_sessions`, `saved_files`, `print_jobs`, `print_job_events`, `payments`, `pricing_rules`. Better Auth tables via CLI.

## 6. Drizzle migrations

Manual additive SQL: `drizzle/0001_add_public_token.sql`, `drizzle/0002_additive_indexes_message.sql`. Use `bun run db:generate` / `db:migrate` for Kit-managed migrations going forward.

## 7–8. Better Auth

Config: `backend/src/auth/index.ts`. Migrate: `bun run auth:migrate` or `npx @better-auth/cli@1.7.4 migrate --yes --config ./src/auth/index.ts`.

## 9. API changes

Root paths unchanged. Success bodies wrapped in `data`. Errors structured.

## 10–12. Storage / payments / files

Unchanged behavior; storage abstraction and Razorpay verify/webhook idempotency preserved. PDF validation via `pdf-parse`.

## 13. Environment

See `backend/.env.example` — includes `SUPABASE_S3_*` aliases.

## 14. Run

```bash
cd backend && bun install && bun run dev
cd client && bun install && bun dev
```

## 15. Tests performed

`bun run typecheck`, `bun test`, `client bun run build` (run after each change set).

## 16. Manual steps

- Set `BETTER_AUTH_URL` to API URL in backend `.env`
- Client `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` match API
- Google OAuth redirect on API host
- Apply additive SQL on Neon if columns/indexes missing
- Razorpay webhook URL + secret in production

## 17. Risks

Cross-origin cookies on `http://localhost` — Bearer fallback remains. Payment columns remain Razorpay-specific in DB.
