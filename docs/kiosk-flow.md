# Kiosk QR Flow

## QR content

Path-style scan URL (preferred):

```
https://quickprint.fun/scan/<public_token>
```

Legacy query style still redirects:

```
https://quickprint.fun/scan?kiosk=<public_token>
```

Human codes such as `KIOSK-001` still resolve via `kiosk_code` on the API.

## Pay-first flow (primary)

1. User uploads a file at `/print`, configures settings, and creates a print job.
2. User pays via Razorpay (no kiosk scan required).
3. After payment, job status is `PAID` / `QUEUED` with no `kiosk_id` — it appears in the ready queue.
4. User is redirected to `/scan` where paid jobs are listed (`GET /print-jobs?view=ready`).
5. At the kiosk, user scans the QR (or opens `/scan/<public_token>`).
6. `GET /kiosks/{token}` — kiosk must be `ACTIVE`.
7. `POST /kiosks/{token}/session` — creates 2h `kiosk_sessions` row.
8. User selects jobs and taps **Print at this kiosk** → `POST /print-jobs/{id}/release`.
9. Backend sets `kiosk_id`, dispatches `job.assigned` over WebSocket when the Pi agent is online.
10. Pi reports `job.printing` / `job.completed`; user can track status at `/print/jobs/{id}`.

## Scan-before-pay (optional fast-path)

If the user scans the kiosk QR before paying:

1. Frontend stores kiosk name/token in `sessionStorage` (`quickprint.kiosk.v1`).
2. On payment success, backend binds the job to the kiosk from the active session.
3. If the Pi agent is connected, the job is auto-dispatched without a manual release step.

## Kiosk service availability

`GET /kiosks/{token}/status` returns whether the Pi agent WebSocket is connected (no secrets exposed). The Scan page disables **Print** when `service.online` is false.

## Live print status

After **Print at this kiosk**, the app navigates to `/print/jobs/{id}` and polls until `COMPLETED` / `FAILED` / `CANCELLED`. Status comes from backend Pi events — not frontend timers.

## Pi agent

- WebSocket: `/ws/kiosk`
- Auth: `Authorization: Bearer <kiosk_uuid>:<agent_token>`
- See [pi-integration.md](./pi-integration.md).

## Release checks

- User owns job
- Job paid and printable (`PAID` / `QUEUED`, not yet dispatched)
- Kiosk active
- Active kiosk session for user and kiosk
