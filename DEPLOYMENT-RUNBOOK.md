# Stawi — Deployment Runbook

Target: **DigitalOcean App Platform**, region **Frankfurt (fra1)**, Node.js runtime.

## Prerequisites
- GitHub repo: `Bucrepinfo-lab/Stawi` (this repo)
- DigitalOcean account + `doctl` CLI authenticated (`doctl auth init`)
- Clerk app (publishable + secret keys, webhook secret)
- Safaricom Daraja **sandbox** app (consumer key/secret, passkey, shortcode)

## 9 steps

1. **Database** — create a Managed PostgreSQL cluster (fra1). Copy its
   connection string into `DATABASE_URL` (append `?sslmode=require`).
2. **Run migrations + seed** — from a machine with `DATABASE_URL` set:
   ```bash
   npm install
   npm run -w @stawi/db generate
   npm run -w @stawi/db migrate         # prisma migrate deploy
   npm run -w @stawi/db seed            # optional: load the demo groups/business
   ```
   > With no `DATABASE_URL`, the app runs on bundled seed data. Set `DATABASE_URL`
   > to switch reads/writes to Postgres automatically (via `lib/data.ts`).
3. **Clerk** — in the Clerk dashboard, copy keys into your env. Register the
   webhook endpoint `POST /api/webhooks/clerk` and copy the signing secret to
   `CLERK_WEBHOOK_SECRET`.
4. **M-Pesa (sandbox)** — create a Daraja sandbox app, set `MPESA_ENV=sandbox`,
   and fill consumer key/secret, passkey, shortcode `174379`. Point
   `MPESA_CALLBACK_URL` at `https://<app>/api/mpesa/callback`.
5. **Spaces** — create a Spaces bucket `stawi` (fra1, CDN on). Save key/secret;
   add the CDN hostname to `next.config.mjs` `images.remotePatterns`.
6. **Create the app** — `doctl apps create --spec .do/app.yaml`. Add all SECRET
   env vars in the DO dashboard (they are slots in `app.yaml`, values not committed).
7. **GitHub Actions secrets** — set `DIGITALOCEAN_ACCESS_TOKEN` and `DO_APP_ID`
   so pushes to `main` auto-deploy.
8. **Domain** — in GoDaddy add a CNAME → the DO app URL; DO issues Let's Encrypt
   SSL automatically.
9. **Verify** — hit `https://<app>/api/health` → expect `{"status":"ok"}`.

## Rollback
- DO App Platform → Deployments → roll back to the previous successful build.
- DB: restore from the latest automated Managed-DB backup.

## Health
- Liveness: `GET /api/health`
- Watch: DO App metrics (CPU/mem), Postgres connections, Clerk + M-Pesa error rates.

## Stripe (global card subscriptions)
- Set `STRIPE_SECRET_KEY`. Checkout activates automatically (subscription mode,
  30-day trial = first month free), charged in USD, localized display elsewhere.
- Register a webhook at `https://<app>/api/billing/webhook` for
  `checkout.session.completed`; copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
- `/api/billing/checkout` returns a hosted Checkout URL; the /subscribe page
  redirects to it when a paid plan is chosen and the Terms are accepted.
- Paystack/Flutterwave/M-Pesa recurring are routed by country (see core/payments.ts)
  and remain stubs until their keys are added.
