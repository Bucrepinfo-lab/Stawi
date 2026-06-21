# Stawi — Pre-Deployment Checklist & Go-Live Report

_Last run: 2026-06-21_

## Automated checks — all passing ✅

| Check | Result |
|---|---|
| Workspace packages (web, mobile, core, db) | ✅ all present |
| Deploy/config files (app.yaml, ci.yml, .env.example, .nvmrc, next.config, middleware, schema, rls.sql, seed, health) | ✅ all present |
| Clerk auth pages (`/sign-in`, `/sign-up`) | ✅ present |
| Full parse sweep (59 web/db/core/mobile files via esbuild) | ✅ 0 failures |
| `@stawi/core` import integrity | ✅ 0 missing exports |
| Prisma schema integrity | ✅ balanced, 13 models / 10 enums |
| `.env.example` completeness (DB, Clerk, M-Pesa, Stripe, AT, Spaces, root domain) | ✅ all keys present |
| Core unit tests | ✅ **98 passing** |

## Code status
- **No broken code.** All functional paths are wired: 3 pillars, tenant isolation
  (query-layer + slug resolver + RLS policy), 12-country compliance, content-safety
  gates, M-Pesa STK (pending→confirmed persistence), receipts, notifications + SMS,
  formalization wizard, global payment routing, **Stripe Checkout (live on key)**.
- Remaining `TODO`s are intentional integration seams (Paystack/Flutterwave stubs;
  webhook→DB subscription activation once a live DB is attached).

## Human go-live steps (need your accounts/keys)
Follow `DEPLOYMENT-RUNBOOK.md`. In short:

1. **Push to GitHub** (`Bucrepinfo-lab/Stawi`).
2. **Provision** DigitalOcean Managed Postgres (fra1) → set `DATABASE_URL`.
3. **Migrate + seed**: `npm i && npm -w @stawi/db run generate && migrate && seed`,
   then apply RLS: `psql "$DATABASE_URL" -f packages/db/prisma/rls.sql`.
4. **Clerk**: set publishable/secret keys; register webhook `/api/webhooks/clerk`.
5. **M-Pesa Daraja (sandbox)**: consumer key/secret, passkey, shortcode `174379`,
   callback `https://<app>/api/mpesa/callback`.
6. **Stripe**: set `STRIPE_SECRET_KEY`; register webhook endpoint
   `https://<app>/api/billing/webhook` → set `STRIPE_WEBHOOK_SECRET`. Checkout goes
   live automatically (subscription mode, 30-day trial = first month free).
7. **DO Spaces** (fra1, CDN) for receipts; add CDN host to `next.config.mjs`.
8. **Africa's Talking** (optional) for SMS acknowledgements.
9. **Domain**: `NEXT_PUBLIC_ROOT_DOMAIN=stawi.app`; GoDaddy CNAME → DO app; wildcard
   `*.stawi.app` for per-tenant subdomains. SSL auto-issued.
10. **Create the app**: `doctl apps create --spec .do/app.yaml`; add all SECRET env
    values in the DO dashboard. Set GitHub Actions secrets
    `DIGITALOCEAN_ACCESS_TOKEN` + `DO_APP_ID` for auto-deploy.
11. **Verify**: `https://<app>/api/health` → `{"status":"ok"}`.

## Post-deploy hardening (recommended)
- Activate RLS enforcement by `SET app.tenant_id` at the start of each
  tenant-scoped DB transaction (policies already in `rls.sql`).
- Replicate the RLS Contribution policy across all tenant-owned child tables.
- Wire the Stripe webhook to flip `Subscription.status = ACTIVE` for the tenant.
- Replace the deterministic moderation filter with (or back it by) a managed
  classifier at scale.
- Add Paystack/Flutterwave concrete integrations (routing already in place).
- Localize UI strings (i18n) and per-market Privacy Policy.

## Risk notes
- Compliance tax rates/registrars are **indicative** — verify per current local law
  before launch in each market (see `COMPLIANCE.md`).
- The Subscription Terms are a **template** — get Kenyan/per-market legal review
  before relying on them (see `legal/SUBSCRIPTION-TERMS.md`).
