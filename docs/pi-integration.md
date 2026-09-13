# Raspberry Pi kiosk integration

End-to-end flow: upload → pay → scan kiosk QR → release job from queue → backend dispatches over WebSocket → Pi MockPrinter → status page shows **Printed**.

## Repositories

| Repo | Path |
|------|------|
| Backend + client | `~/Desktop/quickprint` |
| Pi agent | `~/Desktop/quickprint-pi-agent` |

Do not merge the repositories.

## WebSocket protocol (Pi agent is source of truth)

Aligned with `quickprint-pi-agent/app/protocol.py`:

| Direction | Type | Purpose |
|-----------|------|---------|
| Backend → Pi | `job.assigned` | Job payload + presigned `file_url` |
| Backend → Pi | `ping` | Optional keepalive |
| Pi → Backend | `job.received`, `job.downloading`, `job.printing`, `job.completed`, `job.failed` | Status updates |
| Pi → Backend | `agent.heartbeat` | Periodic heartbeat |
| Backend → Pi | `pong` | Ping reply |

**Pi authentication:** HTTP header on WebSocket upgrade:

```
Authorization: Bearer <AGENT_ID>:<AGENT_TOKEN>
```

- `AGENT_ID` = kiosk UUID (`kiosks.id`)
- `AGENT_TOKEN` = secret from `bun run kiosk:seed` (stored hashed in DB)
- QR `public_token` is **not** used for Pi auth

**WebSocket path:** `/ws/kiosk` on the API host (same port as HTTP).

## Database migration

```bash
cd backend
psql "$DATABASE_URL" -f drizzle/0005_kiosk_agent.sql
```

## Seed Kiosk-1 + agent credentials

```bash
cd backend
bun run kiosk:seed
# First run prints AGENT_ID and AGENT_TOKEN — save them for the Pi .env
# Re-run without duplicating kiosk; use --rotate-agent-token to rotate secret
```

## Generate development QR

```bash
cd backend
# Uses FRONTEND_URL or NEXT_PUBLIC_APP_URL from env
bun run kiosk:qr
```

Output:

- Terminal: scan URL `https://<app>/scan/<public_token>`
- File: `generated/qr-kiosk-1.png` (repo root)

## Start backend

```bash
cd backend
bun install
bun run dev
```

API: `http://localhost:8000`  
WebSocket: `ws://localhost:8000/ws/kiosk`

## Start frontend

```bash
cd client
bun install
bun run dev
```

## Pi agent configuration

On the Raspberry Pi (`~/Desktop/quickprint-pi-agent`), `.env`:

```env
AGENT_ENV=development
AGENT_ID=<kiosk uuid from seed>
AGENT_TOKEN=<secret from seed>
BACKEND_WS_URL=ws://<YOUR_MAC_LAN_IP>:8000/ws/kiosk
PRINTER_MODE=mock
MOCK_PRINT_DELAY_SECONDS=0.5
```

Find Mac LAN IP: `ipconfig getifaddr en0` (Wi‑Fi) or System Settings → Network.

**Important:** `localhost` on the Pi refers to the Pi itself, not your Mac.

```bash
cd ~/Desktop/quickprint-pi-agent
python -m app.main
# or systemd service if configured
```

## End-to-end test procedure

### Terminal 1 — backend

```bash
cd backend && bun run dev
```

### Terminal 2 — frontend

```bash
cd client && bun run dev
```

### Terminal 3 — Pi agent

```bash
cd ~/Desktop/quickprint-pi-agent && python -m app.main
```

### Phone / browser

1. `bun run kiosk:seed` and `bun run kiosk:qr` if not done.
2. Upload PDF at `/print`, configure B&W A4 1 copy, create job.
3. Pay with Razorpay test mode (no kiosk scan required).
4. Redirected to `/scan` — paid job appears in the queue.
5. Scan kiosk QR (`generated/qr-kiosk-1.png`) → connected to Kiosk-1.
6. Select job → **Print at this kiosk**.
7. Pi logs: job received → downloading → printing → completed.
8. App navigates to `/print/jobs/<id>` — live status: Received → Preparing → Printing → **Printed ✓** (polls backend every 2s).
9. On `COMPLETED`, backend deletes source file if `save_file=false`.

Support contact for failures: help@quickprint.fun

## Logs

Backend structured logs use `component: ws` for WebSocket events.

```bash
# Example trace
grep '"component":"ws"' 
```

## Security notes

- Never put `AGENT_TOKEN` or `DATABASE_URL` in the Next.js client.
- Kiosk binding uses `kiosk_sessions` server-side; clients cannot set `kiosk_id`.
- Jobs dispatch only when `payment_status = PAID`.
- Presigned URLs expire per `PI_JOB_DOWNLOAD_EXPIRES` (defaults to `PRESIGNED_URL_EXPIRES`).

## Queue behavior

- PostgreSQL `print_jobs` is the durable queue (no Redis).
- One job in flight per kiosk at a time.
- If Pi is offline at payment, job stays `QUEUED` until reconnect.
- Reconnect dispatches pending `QUEUED` jobs FIFO (no duplicate payment).
