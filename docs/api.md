# REST API

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000`).

Better Auth: `{API_URL}/api/auth/*`

## Authentication

- **Primary:** Better Auth session cookie on the API origin (`credentials: include` from the Next.js client).
- **Fallback:** `Authorization: Bearer <session.token>` when cross-origin cookies are unavailable (local dev).

## Success response

```json
{
  "success": true,
  "data": {}
}
```

## Error response

```json
{
  "success": false,
  "detail": "Human-readable message",
  "code": "ERROR_CODE",
  "error": { "code": "ERROR_CODE", "message": "..." }
}
```

## Webhook exception

`POST /payments/webhook` returns Razorpay-oriented `{ "status": "ok" }` or `{ "status": "ignored" }`.

## Routes

See [backend-rewrite.md](./backend-rewrite.md).
