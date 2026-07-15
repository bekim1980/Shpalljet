# Payments & Entitlements

Premium and Boost are granted **only** after Stripe webhook verification and `grant_listing_entitlement` (service_role).

## Required server environment variables

Set these in **Vercel** (or your API host) and **never** expose them via `VITE_*` or frontend bundles:

| Variable | Required by | Purpose |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Checkout API, webhook | Create Stripe Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Webhook | Verify Stripe event signatures |
| `SUPABASE_SERVICE_ROLE_KEY` | Checkout API, webhook | Insert payments, call grant RPC |
| `SUPABASE_URL` | Checkout API, webhook | Supabase project URL |
| `SUPABASE_ANON_KEY` | Checkout API | Verify user JWT on checkout creation |
| `SITE_URL` | Checkout API (fallback) | Build return URLs if `Origin` header missing |

## Edge functions

| Variable | Required by | Purpose |
|----------|-------------|---------|
| `CRON_SECRET` | `expire-listings` | Authorize scheduled expiry job |

## Stripe Dashboard setup

1. Create webhook endpoint: `https://<your-domain>/api/stripe/webhook`
2. Subscribe to events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
3. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Client checkout request

`POST /api/stripe/create-checkout-session`

```json
{
  "productId": "<listing-uuid>",
  "entitlementType": "premium | premium_renew | boost_1 | boost_3 | boost_7 | auto_renew_on"
}
```

Price, duration, currency, and payment status are **never** accepted from the client.
