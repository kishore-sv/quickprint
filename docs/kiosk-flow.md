# Kiosk QR Flow

## QR content

Prefer a secure token:

```
https://quickprint.fun/scan?kiosk=<public_token>
```

Legacy codes such as `KIOSK-001` still resolve via `kiosk_code`.

## Scan page

1. Parse `kiosk` query or QR payload.
2. `GET /kiosks/{token}` — kiosk must be `ACTIVE`.
3. `POST /kiosks/{token}/session` — creates 2h `kiosk_sessions` row.
4. List paid jobs (`payment_status=PAID`, status `PAID` or `QUEUED`, not claimed).
5. `POST /print-jobs/{id}/release` with `{ "kiosk_code": "<token or code>" }`.

## Release checks

- User owns job
- Job paid and printable
- Kiosk active
- **Active kiosk session** for this user and kiosk

Result: `CLAIMED`, `kiosk_id` set, events logged.
