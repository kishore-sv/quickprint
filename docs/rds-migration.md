# Neon → AWS RDS PostgreSQL migration

This guide prepares and documents moving QuickPrint's PostgreSQL database from Neon to **AWS RDS PostgreSQL**. The application uses standard PostgreSQL (`drizzle-orm/node-postgres` + `pg` Pool) and is not tied to Neon at runtime.

**This document does not create AWS resources or modify production data.** Perform infrastructure and cutover steps manually.

## Application requirements

| Requirement | Detail |
|-------------|--------|
| Driver | `drizzle-orm/node-postgres` + `pg.Pool` |
| Connection | `DATABASE_URL` environment variable only |
| PostgreSQL version | **13+** (for `gen_random_uuid()` without extensions) |
| Extensions | None required by current schema |
| Better Auth | Same `DATABASE_URL` / shared pool |

Production `DATABASE_URL` example (no `sslmode` — TLS is configured via the RDS CA bundle):

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/quickprint
```

Local development example (no SSL required):

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/quickprint
```

### RDS TLS on EC2

On production EC2, the backend uses the **Amazon RDS CA bundle** with explicit `Pool.ssl` ([`backend/src/db/index.ts`](../backend/src/db/index.ts), [`backend/src/db/pool-config.ts`](../backend/src/db/pool-config.ts)):

1. Download the CA bundle on EC2 (once):

   ```bash
   sudo mkdir -p /etc/ssl/rds
   sudo curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
     -o /etc/ssl/rds/global-bundle.pem
   ls -lh /etc/ssl/rds/global-bundle.pem
   ```

2. Do **not** put `sslmode=require` in `DATABASE_URL` when the CA bundle is present — the pool strips `sslmode` and sets `ssl: { ca, rejectUnauthorized: true }`.

3. Optional override: `RDS_CA_CERT_PATH=/path/to/global-bundle.pem` (default: `/etc/ssl/rds/global-bundle.pem`).

4. Do **not** use `rejectUnauthorized: false`.

Local dev without the CA file: no explicit `ssl` on the pool; `localhost` URLs work as before.

Neon URLs (if still used in dev): [`backend/src/config/env.ts`](../backend/src/config/env.ts) strips `channel_binding` and upgrades Neon `sslmode=require` → `verify-full`.

Optional pool tuning (see [`docs/database-performance.md`](database-performance.md)):

```env
DB_POOL_MAX=10
DB_POOL_IDLE_MS=30000
DB_POOL_CONNECT_MS=10000
```

---

## A. Create RDS PostgreSQL instance

Recommended initial architecture:

| Setting | Recommendation |
|---------|----------------|
| Engine | PostgreSQL 13+ (15 or 16 is fine) |
| Region | Same AWS region as EC2 (e.g. `ap-south-1`) |
| Instance class | Small to start (e.g. `db.t4g.micro`, `db.t3.micro`) |
| Storage | gp3, 20–30 GB |
| Public access | **No** — private database in VPC |
| Automated backups | Enabled |
| Multi-AZ | Optional for production; not required initially |

Do not hardcode credentials in source code or Git.

---

## B. Security group

RDS inbound rules:

| Type | Port | Source |
|------|------|--------|
| PostgreSQL | 5432 | **EC2 security group** (not `0.0.0.0/0`) |

Do **not** expose port 5432 to the public internet.

EC2 security group should **not** need inbound 5432; only outbound from EC2 to RDS.

---

## C. Install RDS CA bundle on EC2

Before testing the application, install the Amazon RDS CA certificate on the backend EC2 host:

```bash
sudo mkdir -p /etc/ssl/rds
sudo curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -o /etc/ssl/rds/global-bundle.pem
ls -lh /etc/ssl/rds/global-bundle.pem
```

The backend auto-detects this path and enables verified TLS for RDS.

---

## D. Test EC2 → RDS connectivity

From the EC2 backend host, install `postgresql-client` if needed:

```bash
sudo apt install -y postgresql-client
```

**Option 1 — `psql` with SSL mode (admin check):**

```bash
export PGPASSWORD='YOUR_PASSWORD'
psql "host=RDS_ENDPOINT port=5432 dbname=quickprint user=USERNAME sslmode=require" -c "SELECT version();"
unset PGPASSWORD
```

**Option 2 — `.pgpass` file** (mode `600`) for repeated admin use.

Application connectivity test (from `backend/` with full `.env` loaded; `DATABASE_URL` without `sslmode`):

```bash
cd /opt/quickprint-backend
bun run db:ping
```

`db:ping` prints host/port/database and PostgreSQL version only — never the password or full URL.

---

## E. Database and user creation

If using the RDS master user and default database, you may only need to create the `quickprint` database.

Connect as the RDS master user and run:

```sql
CREATE DATABASE quickprint;

CREATE USER quickprint_app WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE quickprint TO quickprint_app;

\c quickprint
GRANT ALL ON SCHEMA public TO quickprint_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quickprint_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quickprint_app;
```

Use your actual naming and least-privilege policy. Update `DATABASE_URL` with the application user.

---

## F. Migration paths

### Project migration commands (actual scripts)

From `backend/`:

| Script | Command | Purpose |
|--------|---------|---------|
| `auth:migrate` | `bunx @better-auth/cli@1.7.4 migrate --yes --config ./src/auth/index.ts` | Better Auth tables |
| `db:apply` | `bun run src/scripts/apply-sql-migrations.ts` | Idempotent additive SQL (`0001_*.sql`–`0007_*.sql`; skips `0000_*` baseline) |
| `db:migrate` | `drizzle-kit migrate` | Drizzle Kit migrations (journal currently empty — no generated migrations yet) |
| `db:ping` | `bun run src/scripts/db-ping.ts` | Test connectivity |
| `db:check` | `drizzle-kit check` | Schema drift check |

**Bootstrap note:** `db:apply` only contains `ALTER TABLE` / `CREATE INDEX` migrations. Base application tables historically came from legacy Alembic `001_initial` (not in this repo). A completely empty RDS needs base schema before `db:apply` is meaningful.

**Drizzle Kit on EC2 (RDS TLS):** [`drizzle.config.ts`](../backend/drizzle.config.ts) uses the same CA detection as the runtime pool. When a CA bundle is present it passes discrete `host`/`user`/`ssl` fields (drizzle-kit **ignores** `ssl` if `url` is used). Install the CA bundle (section C), load `.env`, then:

```bash
set -a && source .env && set +a
bunx drizzle-kit push
# or: bun run db:migrate
```

Local Mac (Neon/localhost): no CA file at `/etc/ssl/rds/` → Drizzle Kit connects without RDS SSL.

---

### PATH A — Fresh RDS (development / test data only)

Use when Neon has no production data you need to keep.

1. Create RDS instance and security group (sections A–B).
2. Create database and user (section D).
3. Set `DATABASE_URL` to the RDS connection string.
4. Run Better Auth migrations:

   ```bash
   cd backend
   bun run auth:migrate
   ```

5. Bootstrap application tables (one-time). Choose one:

   - **From Drizzle schema** (empty DB):

     ```bash
     bunx drizzle-kit push
     ```

   - **Schema-only dump** from a reference database:

     ```bash
     pg_dump --schema-only "$SOURCE_DATABASE_URL" | psql "$DATABASE_URL"
     ```

6. Apply additive migrations:

   ```bash
   bun run db:apply
   ```

7. Verify connectivity:

   ```bash
   bun run db:ping
   ```

8. Configure production `.env` on EC2 and restart the backend (sections G–H).

---

### PATH B — Migrate existing Neon production data

Use when Neon contains real users, jobs, payments, or kiosks.

**Warnings:**

- Take a full backup before any cutover.
- Test restore on a staging RDS instance first.
- Plan a short maintenance window for cutover.
- Do **not** delete Neon until RDS is verified in production.
- Review roles, sequences, and row counts after restore.

**1. Backup Neon**

```bash
pg_dump -Fc -f quickprint-neon-$(date +%Y%m%d).dump "$NEON_DATABASE_URL"
```

Or plain SQL:

```bash
pg_dump -f quickprint-neon-$(date +%Y%m%d).sql "$NEON_DATABASE_URL"
```

Store the backup securely. Never commit it to Git.

**2. Create RDS** (sections A–D).

**3. Restore to RDS**

Custom format:

```bash
pg_restore -d "$DATABASE_URL" --no-owner --no-acl quickprint-neon-YYYYMMDD.dump
```

Plain SQL:

```bash
psql "$DATABASE_URL" -f quickprint-neon-YYYYMMDD.sql
```

**4. Apply any additive migrations not yet on the restored DB:**

```bash
cd backend
bun run db:apply
```

`db:apply` is idempotent (`IF NOT EXISTS`, etc.).

**5. Verify data**

```sql
SELECT COUNT(*) FROM "user";
SELECT COUNT(*) FROM print_jobs;
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM kiosks;
```

Check sequences if you inserted data manually:

```sql
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';
```

**6. Cutover**

- Update EC2 `DATABASE_URL` in `/opt/quickprint-backend/.env`.
- Restart backend (section H).
- Run application verification (section I).
- Keep Neon read-only or available for rollback until confident.

---

## G. Verify tables

```bash
psql "$DATABASE_URL" -c "\dt"
```

Or:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY 1;
```

Expected application tables include: `profiles`, `kiosks`, `saved_files`, `print_jobs`, `print_job_events`, `payments`, `kiosk_sessions`, `pricing_rules`.

Better Auth tables include: `user`, `session`, `account`, `verification`, and related tables created by `auth:migrate`.

---

## H. Configure production DATABASE_URL

On EC2, edit `/opt/quickprint-backend/.env`:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/quickprint
# Optional if CA is not at default path:
# RDS_CA_CERT_PATH=/etc/ssl/rds/global-bundle.pem
```

Ensure `/etc/ssl/rds/global-bundle.pem` exists (section C). Do **not** add `?sslmode=require` — the pool configures TLS with the CA bundle.

Permissions:

```bash
sudo chmod 600 /opt/quickprint-backend/.env
```

The database provider change is **only** through `DATABASE_URL`. No systemd code changes are required.

---

## I. Restart backend and verify health

```bash
sudo systemctl restart quickprint-backend
sudo systemctl status quickprint-backend
```

From EC2:

```bash
curl http://127.0.0.1:8000/health
cd /opt/quickprint-backend && bun run db:ping
```

From your machine:

```bash
curl https://qpapi.mmkerp.shop/health
```

The `/health` endpoint confirms the API process is running; `db:ping` confirms database connectivity.

---

## J. Application verification checklist

After cutover, verify:

- [ ] Login (email/password, Google if enabled)
- [ ] Better Auth session persists across requests
- [ ] File upload (Supabase Storage — unchanged)
- [ ] Print job creation
- [ ] Razorpay payment flow
- [ ] Kiosk release / scan flow
- [ ] WebSocket (kiosk agent + display)
- [ ] Database reads and writes (jobs, payments, sessions)

Check backend logs:

```bash
sudo journalctl -u quickprint-backend -n 100 --no-pager
```

---

## systemd (no changes required)

The production service loads environment from:

```ini
EnvironmentFile=/opt/quickprint-backend/.env
```

See [`backend/ec2-setup.md`](../backend/ec2-setup.md) for the full unit file. Database migration does not require systemd edits.

---

## Rollback

If RDS cutover fails:

1. Revert `DATABASE_URL` in `.env` to the Neon connection string.
2. `sudo systemctl restart quickprint-backend`
3. Verify `curl https://qpapi.mmkerp.shop/health`
4. Investigate RDS connectivity, security groups, or restore issues before retrying.

Do not delete Neon backups or the Neon project until RDS is stable.

---

## Related documentation

- [`docs/database.md`](database.md) — schema and migration overview
- [`docs/database-performance.md`](database-performance.md) — pool settings and indexes
- [`backend/README.md`](../backend/README.md) — backend scripts
- [`backend/ec2-setup.md`](../backend/ec2-setup.md) — full EC2 deployment guide
