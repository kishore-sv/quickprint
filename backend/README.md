# QuickPrint API (Bun + Express)

## Requirements

- Bun 1.1+
- Neon PostgreSQL `DATABASE_URL`
- Supabase S3-compatible credentials
- Razorpay keys

## Setup

```bash
bun install
cp .env.example .env
# edit .env
```

## Commands

| Script | Description |
|--------|-------------|
| `bun run dev` | Watch mode API |
| `bun run start` | Production start |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Unit tests |
| `bun run db:generate` | Drizzle Kit generate SQL from schema |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:check` | Schema drift check |
| `bun run auth:migrate` | Better Auth tables (inspect DB first) |
| `bun run retention:cleanup` | Delete expired saved files / job blobs |

## Better Auth migration

Primary (Bun):

```bash
bun run auth:migrate
```

Fallback (npm CLI):

```bash
npx @better-auth/cli@1.7.4 migrate --yes --config ./src/auth/index.ts
```

Auth routes: `{BETTER_AUTH_URL}/api/auth/*`

Set `BETTER_AUTH_URL` to the public API origin (e.g. `http://localhost:8000`).

Google OAuth redirect (example): `http://localhost:8000/api/auth/callback/google`

## Application SQL (additive)

If upgrading an existing Neon DB from Alembic:

```bash
psql "$DATABASE_URL" -f drizzle/0001_add_public_token.sql
psql "$DATABASE_URL" -f drizzle/0002_additive_indexes_message.sql
psql "$DATABASE_URL" -f drizzle/0003_uuid_column_defaults.sql
psql "$DATABASE_URL" -f drizzle/0004_performance_indexes.sql
```

Better Auth tables are **not** managed by Drizzle — only application tables in `src/db/schema/`.

## Database driver

Uses `pg` `Pool` with Neon pooled connection string. Suitable for long-running Express on Railway/Fly.

## CORS and cookies

`FRONTEND_URL` and `CORS_ORIGINS` must include the Next.js origin. API requests use `credentials: include`; session cookies are set on the API host. Local cross-origin dev may still send `Authorization: Bearer` as fallback when the client has a session token.

## Storage env

`S3_*` variables are required. Optional aliases: `SUPABASE_S3_*` (see `.env.example`).
