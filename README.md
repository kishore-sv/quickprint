# QuickPrint

College/document printing platform — upload a PDF, configure options, pay online, then release the job at a kiosk via QR.

**Stack:** Next.js client, **Bun + Express** API, Neon PostgreSQL, Better Auth, Supabase Storage (S3 API), Razorpay.

Live domain: [quickprint.fun](https://quickprint.fun)

## Architecture

```
client/   Next.js + shadcn/ui  →  Vercel
backend/  Bun + Express + Better Auth  →  Railway (or similar)
          ↓
Neon PostgreSQL + Supabase S3 + Razorpay
```

See [docs/architecture.md](docs/architecture.md) and [docs/backend-rewrite.md](docs/backend-rewrite.md).

## Folder structure

```
quickprint/
  README.md
  docs/
  client/          Next.js frontend (UI only)
  backend/         Bun Express API + Better Auth
```

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- Node.js 20+ (for Next.js if not using Bun for client)
- Neon PostgreSQL database
- Supabase project (S3-compatible storage credentials)
- Google OAuth credentials (optional)
- Razorpay test/live keys

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Random secret |
| `BETTER_AUTH_URL` | Public API URL, e.g. `http://localhost:8000` |
| `FRONTEND_URL` | Next.js origin, e.g. `http://localhost:3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google login |
| `S3_*` | Supabase S3 endpoint, keys, bucket |
| `RAZORPAY_*` | Key id, secret, webhook secret |
| `MAX_UPLOAD_BYTES` | Default 20MB |

### Client (`client/.env.local`)

Copy from `client/.env.example`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Express API, e.g. `http://localhost:8000` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Same as API URL |
| `NEXT_PUBLIC_APP_URL` | Frontend URL for redirects |

Auth secrets and `DATABASE_URL` live **only** on the backend.

## Setup — backend

```bash
cd backend
bun install
cp .env.example .env
# edit .env (DATABASE_URL, secrets, S3, Razorpay)
```

### Database migrations

1. **Better Auth tables** (inspect Neon first; non-destructive):

```bash
cd backend
bun run auth:migrate
```

Uses: `bunx better-auth migrate --yes --config ./src/auth/index.ts`

2. **Application schema** — if you already ran legacy Alembic `001_initial`, only add kiosk tokens:

```bash
psql "$DATABASE_URL" -f drizzle/0001_add_public_token.sql
```

Fresh installs: apply Alembic history from legacy migration or equivalent Drizzle SQL before starting.

### Run API

```bash
cd backend
bun run dev
```

API: [http://localhost:8000](http://localhost:8000)  
Better Auth: [http://localhost:8000/api/auth](http://localhost:8000/api/auth)

## Setup — frontend

```bash
cd client
bun install
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_BETTER_AUTH_URL to backend URL
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## How the client talks to Express

- **Auth:** `better-auth` React client → `NEXT_PUBLIC_BETTER_AUTH_URL` (`/api/auth/*` on Express)
- **API:** `lib/api.ts` → `NEXT_PUBLIC_API_URL` with `Authorization: Bearer <session.token>`

## Google OAuth

Set redirect URI to your API origin, e.g. `http://localhost:8000/api/auth/callback/google` (per Better Auth docs for your version).

## Razorpay

1. `POST /payments/create` on the API
2. Checkout in the browser
3. `POST /payments/verify` and/or webhook `POST /payments/webhook`

## Tests

```bash
cd backend
bun test
```

```bash
cd client
bun run build
```

## Common troubleshooting

| Issue | Check |
|-------|--------|
| 401 on API | Session token; `BETTER_AUTH_URL` matches API origin |
| CORS | `FRONTEND_URL` / `CORS_ORIGINS` include exact frontend origin |
| Upload fails | PDF size/MIME; S3 credentials |
| Auth migrate | Backup DB; never run destructive drops on production |

## License

Private project — all rights reserved.
