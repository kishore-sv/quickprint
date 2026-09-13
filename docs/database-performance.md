# Database performance

QuickPrint uses **Neon PostgreSQL** with **Drizzle ORM** and **`pg` connection pooling** on a long-running **Bun + Express** API (Railway). This document records connection setup, indexes, query patterns, and measurement notes.

## Regions and latency

| Component | Typical deployment | Notes |
|-----------|-------------------|--------|
| Next.js client | Vercel (edge/CDN) | UI only; no `DATABASE_URL` |
| API | Railway | Long-running process; reuse DB pool |
| PostgreSQL | Neon | Prefer same AWS region as Railway when possible |
| Object storage | Supabase S3 (`ap-south-1` in examples) | PDF bytes; not in Postgres |

**Recommendation:** In Neon Console → Project Settings, note the database region. In Railway → service → Settings, align the API region (e.g. `aws-ap-south-1` for India). Cross-region API↔Neon adds tens of ms per query. Changing production region requires a planned Neon/Railway migration (not automated in app code).

## Connection method

- **Driver:** `drizzle-orm/node-postgres` + `pg.Pool` ([`backend/src/db/index.ts`](../backend/src/db/index.ts)).
- **Better Auth** uses the **same** `pool` instance (no second pool).
- **Not used:** `@neondatabase/serverless` (appropriate for per-invocation serverless; this API is long-running).

### `DATABASE_URL`

- Use Neon’s **pooled** connection string for production when running multiple API instances or to limit server connections:
  - Hostname contains `-pooler` (e.g. `ep-xxx-pooler.ap-southeast-1.aws.neon.tech`).
- Direct (non-pooler) hostname is acceptable for a **single** long-lived Railway replica with a small `max` pool size.
- `sslmode` is normalized to `verify-full` in [`backend/src/config/env.ts`](../backend/src/config/env.ts) for Neon compatibility.
- **Never** expose `DATABASE_URL` to the Next.js client.

### Pool settings

Environment (optional):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_POOL_MAX` | `10` | Max connections per API process |
| `DB_POOL_IDLE_MS` | `30000` | Idle client timeout |
| `DB_POOL_CONNECT_MS` | `10000` | Connection timeout |

`application_name=quickprint-api` is set on the pool for Neon monitoring.

## Indexes (application tables)

Applied via additive SQL in [`backend/drizzle/`](../backend/drizzle/). Verify on any environment:

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('print_jobs', 'saved_files', 'payments', 'kiosk_sessions')
ORDER BY tablename, indexname;
```

Important indexes for current query patterns:

| Index | Table | Query pattern |
|-------|-------|----------------|
| `ix_print_jobs_user_id` | `print_jobs` | `WHERE user_id = ?` |
| `ix_print_jobs_user_id_created_at` | `print_jobs` | List/history: user + `ORDER BY created_at DESC` |
| `ix_saved_files_user_id` | `saved_files` | `WHERE user_id = ?` |
| `ix_saved_files_user_id_created_at` | `saved_files` | File list sort |
| `ix_payments_print_job_id_status_created_at` | `payments` | Open payment for job |
| `ix_kiosk_sessions_user_kiosk_expires` | `kiosk_sessions` | Active session check |

Better Auth tables have their own indexes from `bun run auth:migrate`.

## Query patterns and optimizations

### Print job lists

- **Pagination:** `GET /print-jobs` and `GET /me/print-jobs` accept `page` (1-based) and `limit` (max 50). Response: `{ items, page, limit, has_more }`.
- **Active jobs (home / scan):** `GET /print-jobs?view=active&limit=20` filters in SQL to unpaid non-terminal jobs and paid queued jobs (same rules as client `isActiveJob` / `jobReadyForKioskRelease`).
- **List selects** omit `storage_key`, `file_hash`, `pricing_snapshot`, and `file_size_bytes` (not needed for API list JSON).

### Saved files

- `GET /files` returns metadata only; **no** presigned URLs on list (`download_url` omitted). Clients that need the PDF use `GET /files/:id`.

### Auth

- `requireAuth` resolves the session once and attaches user fields to `req.auth` for `/me` (no second `getSession` in the route).
- Client `apiFetch` calls `getSession` once per request.

### Pricing

- `getActiveRates()` uses an in-process TTL cache (~60s). Not used for payment or job status.

### Transactions

- Payment success updates run in a short DB transaction only ([`payment.service.ts`](../backend/src/services/payment.service.ts)). Razorpay HTTP calls stay outside transactions.

## EXPLAIN (safe patterns)

Run against staging or local data (avoid heavy `EXPLAIN ANALYZE` on large production tables):

```sql
EXPLAIN
SELECT * FROM print_jobs
WHERE user_id = 'example-user-id'
ORDER BY created_at DESC
LIMIT 20;

EXPLAIN
SELECT * FROM payments
WHERE print_job_id = '00000000-0000-0000-0000-000000000000'
  AND status = 'CREATED'
ORDER BY created_at DESC
LIMIT 1;

EXPLAIN
SELECT * FROM kiosk_sessions
WHERE user_id = 'example-user-id'
  AND kiosk_id = '00000000-0000-0000-0000-000000000000'
  AND expires_at > now()
LIMIT 1;
```

Look for `Index Scan` / `Bitmap Index Scan` on the indexes above; avoid sequential scans on large `print_jobs` for user-scoped lists.

## Benchmark script

From `backend/` with the API running and a valid session cookie or bearer token:

```bash
export API_URL=http://localhost:8000
export AUTH_HEADER="Authorization: Bearer <session.token>"
bun run src/scripts/bench-api.ts
```

The script prints median latency for key routes. Re-run after optimizations and record results below.

## Before / after measurements

Record locally or on staging (not production under load). Example format:

| Endpoint | Before (ms p50) | After (ms p50) | Notes |
|----------|-----------------|----------------|-------|
| `GET /me` | _run bench_ | _run bench_ | Session + profile |
| `GET /print-jobs?view=active&limit=20` | _run bench_ | _run bench_ | Home/scan |
| `GET /me/print-jobs?page=1&limit=20` | _run bench_ | _run bench_ | History |
| `GET /print-jobs/:id` | _run bench_ | _run bench_ | Detail |
| `GET /files` | _run bench_ | _run bench_ | Metadata only |
| `GET /kiosks/:token` | _run bench_ | _run bench_ | Public |

Run after deploy or with local API + `AUTH_HEADER`:

```bash
cd backend && API_URL=http://localhost:8000 AUTH_HEADER="Bearer …" bun run src/scripts/bench-api.ts
```

Implementation verification (local): backend `bun run typecheck`, `bun test` (13 pass); client `bun run build` succeeded. Fill medians in the table above when measuring against your environment.

## Identified bottlenecks (addressed in code)

1. Duplicate `pg.Pool` for Better Auth and Drizzle.
2. Possible missing `user_id` indexes on `print_jobs` / `saved_files` in DBs that only ran partial migrations.
3. Full-row `SELECT *` for job lists including large `pricing_snapshot` JSON.
4. No pagination on history (up to 100 jobs per request).
5. Home/scan downloaded all jobs then filtered client-side.
6. Double `getSession` on client per `apiFetch` and on `GET /me` handler.
7. `GET /files` presigned every object on list (unused by UI).
8. Repeated `pricing_rules` query on every print flow load.

## Caching strategy (current)

| Data | Cache | Invalidation |
|------|-------|----------------|
| Pricing rules | In-process ~60s | Process restart / TTL |
| Kiosk public info | None | — |
| Session / jobs / payments | None | — |

Redis/BullMQ are **not** used in this phase.

## Future improvements

- Embed minimal saved-file fields on `GET /print-jobs/:id` to save one HTTP round trip (optional).
- Retention cron: partial index on `(status, save_file)` if cleanup scans grow.
- Read replicas / Redis only if traffic warrants.
