# Payments (Razorpay)

## Flow

1. Print job calculated and moved to `PAYMENT_PENDING`.
2. `POST /payments/create` — create Razorpay order, insert `payments` row, event `PAYMENT_CREATED`.
3. Frontend opens Razorpay Checkout with `order_id` and public `key_id`.
4. On success, client calls `POST /payments/verify` with order id, payment id, signature.
5. Razorpay may also call `POST /payments/webhook` — same idempotent handler.

## Verification

Signature verified with HMAC-SHA256 using `RAZORPAY_KEY_SECRET`:

```
hmac(order_id + "|" + payment_id, secret) == signature
```

Webhook body verified with `RAZORPAY_WEBHOOK_SECRET`.

## Idempotency

If `payment_id` already marked `SUCCESS` for the job, return success without double-updating job status.

## Success Side Effects

- `payments.status` = `SUCCESS`
- `print_jobs.payment_status` = `PAID`
- `print_jobs.status` = `QUEUED`
- `print_jobs.paid_at` = now
- Event `PAYMENT_SUCCESS`

## Environment

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Public key may be exposed to frontend as `NEXT_PUBLIC_RAZORPAY_KEY_ID` for Checkout.
