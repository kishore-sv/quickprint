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

## Print job lists

`GET /print-jobs` and `GET /me/print-jobs` return paginated data:

```json
{
  "success": true,
  "data": {
    "items": [ /* PrintJob */ ],
    "page": 1,
    "limit": 20,
    "has_more": false
  }
}
```

Query parameters:

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | 1-based page |
| `limit` | `20` | Page size (max 50) |
| `view` | `all` | `all`, `active` (home), or `ready` (kiosk scan) |
| `status` | — | Optional status filter |

`GET /files` returns saved-file metadata only (no presigned URLs). Use `GET /files/:id` when a download URL is required.

See [database-performance.md](./database-performance.md) for pooling and indexes.

## Routes

See [backend-rewrite.md](./backend-rewrite.md).
