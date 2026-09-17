# Authentication

Authentication is owned by **Better Auth** on the **Express API** (`/api/auth/*`).

## Providers

- Google OAuth (optional)
- Email + password
- Anonymous (guest)

## Client

`client/lib/auth-client.ts` points `baseURL` to `NEXT_PUBLIC_BETTER_AUTH_URL` (same host as `NEXT_PUBLIC_API_URL`).

There is **no** Next.js `/api/auth` route.

## API authorization

REST routes use `requireAuth` middleware:

1. Client uses `credentials: include` on API `fetch` calls; Better Auth cookies are set on the API host.
2. Optional fallback: `Authorization: Bearer <session.token>` for local cross-origin dev.
3. Server resolves session via `auth.api.getSession({ headers })`.
4. Business routes never trust `userId` from the request body.

## Database migrations

From `backend/`:

```bash
cd backend
bun run auth:migrate
```

Fallback:

```bash
npx @better-auth/cli@1.7.4 migrate --yes --config ./src/auth/index.ts
```

Uses the same PostgreSQL `DATABASE_URL` as application data. Inspect existing auth tables before migrating; do not run destructive drops on production.

## Environment (backend)

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (public API URL)
- `FRONTEND_URL`, `CORS_ORIGINS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Profiles

Application table `profiles` is upserted on first authenticated API use (`ensureProfile`).
