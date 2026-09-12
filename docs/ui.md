# UI

Mobile-first QuickPrint web app in `client/`.

## Layout

- Centered column: `max-w-md mx-auto min-h-dvh`
- Top bar: logo, “QuickPrint”, profile dropdown
- Bottom navigation: Home, Print, Scan, History
- Desktop browsers see the same narrow shell (app-like, not a wide dashboard)

## Routes

| Path | Section |
|------|---------|
| `/home` | Landing, pricing, CTAs |
| `/print` | Upload, settings, pay |
| `/scan` | QR / `?kiosk=` deep link, release |
| `/history` | Past jobs, print again |
| `/sign-in`, `/sign-up` | Auth |

`/` redirects to `/home`.

## Design System

shadcn/ui (`base-sera` / `mist`). Components under `client/components/ui/`. App-specific shell under `client/components/app-shell/`.

## Guest UX

Profile menu shows “Guest” with links to sign in / sign up. Printing does not require account.

## PDF

Client uses PDF.js for page count and optional preview. Backend re-validates on upload.

## Payments

Razorpay Checkout script loaded on pay action; success triggers verify API call.
