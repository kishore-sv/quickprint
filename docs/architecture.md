# QuickPrint Architecture

## Overview

QuickPrint is a college/document printing platform. Phase 1 delivers the web application, API, payments, and kiosk QR flow. Physical printing via Raspberry Pi and CUPS is **Phase 2**.

**Domain:** https://quickprint.fun

## Phase 1 Stack

```
Next.js (Vercel) — UI only
       ↓ REST + Bearer session + Better Auth client
Bun + Express (Railway)
       ↓
Neon PostgreSQL  ← Better Auth + application tables
       +
Supabase Storage (S3-compatible API)
       +
Razorpay
```

## Trust Boundaries

| Layer | Responsibility |
|-------|----------------|
| Browser | UX, PDF preview (non-authoritative), Razorpay Checkout UI |
| Express | Better Auth, authoritative pricing, files, payments, job lifecycle |
| Razorpay | Payment capture; success only after server verify/webhook |

## Repository Layout

```
quickprint/
  client/     Next.js UI
  backend/    Bun + Express + Better Auth
  docs/       Architecture and runbooks
```

See [backend-rewrite.md](./backend-rewrite.md) for migration notes.
