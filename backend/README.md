# QuickPrint API (Bun + Express)

## Requirements

- Bun 1.1+
- PostgreSQL `DATABASE_URL` (local, AWS RDS, or any compatible host)
- Supabase S3-compatible credentials
- Razorpay keys

## Setup

```bash
bun install
cp .env.example .env
# edit .env
```

### Local database (Docker)

From the repo root:

```bash
docker compose up -d
cd backend
cp .env.example .env   # includes docker Postgres + Redis URLs
bun run db:setup:local # Better Auth tables + application SQL
```

Use `bun run auth:migrate:local` (not `auth:migrate`) on macOS — the default CLI runs under Node and can fail with `ERR_REQUIRE_ESM`. Production EC2 keeps using `auth:migrate`.

## Commands

| Script | Description |
|--------|-------------|
| `bun run dev` | Watch mode API |
| `bun run start` | Production start |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Unit tests |
| `bun run db:generate` | Drizzle Kit generate SQL from schema |
| `bun run db:migrate` | Apply Drizzle Kit migrations (set `RDS_CA_CERT_PATH` on EC2 for RDS) |
| `bun run db:apply` | Apply additive SQL in `drizzle/*.sql` |
| `bun run db:ping` | Test database connectivity |
| `bun run db:check` | Schema drift check |
| `bun run auth:migrate` | Better Auth tables (production / Linux) |
| `bun run auth:migrate:local` | Better Auth tables (local macOS / Bun runtime) |
| `bun run db:setup:local` | Auth tables + `db:apply` for Docker Postgres |
| `bun run retention:cleanup` | Delete expired saved files / job blobs |
| `bun run worker:refund` | BullMQ refund worker (separate process) |

## Refunds (local)

Redis must be running (`docker compose up -d` from repo root). Apply migrations, then:

```bash
bun run db:apply
bun run dev              # API
bun run worker:refund    # separate terminal
```

Set `REDIS_URL=redis://127.0.0.1:6379` in `.env`.

## Better Auth migration

```bash
bun run auth:migrate
```

Uses the `auth` CLI package (same major version as `better-auth`; not `@better-auth/cli`, which only exists up to 1.4.x).

Auth routes: `{BETTER_AUTH_URL}/api/auth/*`

Set `BETTER_AUTH_URL` to the public API origin (e.g. `http://localhost:8000`).

Google OAuth redirect (example): `http://localhost:8000/api/auth/callback/google`

## Application SQL (additive)

Apply idempotent migrations:

```bash
bun run db:apply
```

Or individually with `psql`:

```bash
psql "$DATABASE_URL" -f drizzle/0001_add_public_token.sql
psql "$DATABASE_URL" -f drizzle/0002_additive_indexes_message.sql
psql "$DATABASE_URL" -f drizzle/0003_uuid_column_defaults.sql
psql "$DATABASE_URL" -f drizzle/0004_performance_indexes.sql
psql "$DATABASE_URL" -f drizzle/0005_kiosk_agent.sql
```

Better Auth tables are **not** managed by Drizzle — only application tables in `src/db/schema/`.

## Database driver

Uses `drizzle-orm/node-postgres` + `pg.Pool` driven entirely by `DATABASE_URL`. Suitable for long-running Express on EC2.

RDS migration guide: [`docs/rds-migration.md`](../docs/rds-migration.md)

## CORS and cookies

`FRONTEND_URL` and `CORS_ORIGINS` must include the Next.js origin. API requests use `credentials: include`; session cookies are set on the API host. Local cross-origin dev may still send `Authorization: Bearer` as fallback when the client has a session token.

## Storage env

`S3_*` variables are required. Optional aliases: `SUPABASE_S3_*` (see `.env.example`).
