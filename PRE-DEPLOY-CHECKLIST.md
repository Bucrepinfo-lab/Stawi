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
2. **Provision** managed Postgres (EU) → `fly secrets set DATABASE_URL=...`.
3. **Migrate + seed**: `npm i && npm -w @stawi/db run generate && migrate && seed`,
   then apply RLS: `psql "$DATABASE_URL" -f packages/db/prisma/rls.sql`.
4. **Clerk**: set publishable/secret keys; register webhook `/api/webhooks/clerk`.
5. **M-Pesa Daraja (sandbox)**: consumer key/secret, passkey, shortcode `174379`,
   callback `https://<app>/api/mpesa/callback`.
6. **Stripe**: set `STRIPE_SECRET_KEY`; register webhook endpoint
   `https://<app>/api/billing/webhook` → set `STRIPE_WEBHOOK_SECRET`. Checkout goes
   live automatically (subscription mode, 30-day trial = first month free).
7. **Object storage** — not needed for v1 (receipts render on demand).
8. **Africa's Talking** (optional) for SMS acknowledgements.
9. **Domain**: `NEXT_PUBLIC_ROOT_DOMAIN=stawi.app`; GoDaddy CNAME → DO app; wildcard
   `*.stawi.app` for per-tenant subdomains. SSL auto-issued.
10. **Create the app**: `fly apps create stawi`; set secrets with `fly secrets set`
    (names in DEPLOYMENT-RUNBOOK.md); add the `FLY_API_TOKEN` repo secret to arm
    auto-deploy.
11. **Verify**: `https://<app>/api/health` → `{"status":"ok"}`.
12. **Cron**: set `CRON_SECRET` env + GitHub repo secrets `CRON_URL`
    (`https://<app>/api/cron`) and `CRON_SECRET` — `.github/workflows/cron.yml`
    pings daily (interest accrual runs month-end, dunning daily).
13. **Paystack / Flutterwave** (optional, per market): `PAYSTACK_SECRET_KEY`,
    `FLW_SECRET_KEY` — concrete init/verify clients go live on key.

14. **Database schema + demo data**: after `DATABASE_URL` is set, run
    `npm run -w @stawi/db generate` then `npm run -w @stawi/db push` (or
    `migrate:dev --name pillar1_cockpit` for versioned migrations), then
    `psql "$DATABASE_URL" -f packages/db/prisma/rls.sql`, and optionally
    `npm run -w @stawi/db seed`. See `DB-SETUP.md`. In production the app **requires**
    `DATABASE_URL` — the mobile API returns 503 rather than serving demo data.
15. **Mobile API auth**: set `MOBILE_API_KEY` (shared-key fallback) and/or rely on
    Clerk session tokens (verified via `CLERK_SECRET_KEY`). The Expo app sets
    `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and either
    `EXPO_PUBLIC_API_KEY` or Clerk auth — see `apps/mobile/.env.example`.

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
