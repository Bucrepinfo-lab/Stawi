---
name: do-deploy-runbook
description: Use when deploying Stawi to DigitalOcean App Platform or editing deploy config — reconcile the Clerk→Supabase auth drift in .do/app.yaml and ci.yml FIRST, then follow the CI gate order and the runbook steps. Deploy is gated on DEPLOY_ENABLED.
---

# DO Deploy Runbook

**Purpose:** Turn the deploy docs into an executable sequence for DigitalOcean App
Platform (region fra1). Catch the known auth drift before it reaches production,
then provision, migrate, and verify.

## When to use
- Preparing or executing a deploy to DigitalOcean App Platform.
- Editing `.do/app.yaml`, `.github/workflows/ci.yml` / `cron.yml`, or env wiring.
- Diagnosing a failed build/deploy.

## Ground-truth files (read before acting)
- `DEPLOYMENT-RUNBOOK.md` (9 steps + rollback/health), `PRE-DEPLOY-CHECKLIST.md`
  (go-live steps + risk notes), `DB-SETUP.md` (persist writes).
- `.do/app.yaml` (App Platform spec + env slots), `.github/workflows/ci.yml`
  (CI + gated deploy), `.github/workflows/cron.yml` (daily `/api/cron`).
- `.env.example` (canonical env var names — Supabase), `MEMORY.md` (auth-migration log).

## STEP 0 (do this FIRST) — reconcile the Clerk → Supabase auth drift
`MEMORY.md` records auth migrated **Clerk → Supabase phone-OTP** (web + mobile; OTP
SMS via Africa's Talking), and `.env.example` is already Supabase
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SEND_SMS_HOOK_SECRET`, `SUPABASE_JWT_SECRET`). But the deploy config still
references **Clerk** and will provision the wrong secrets / fail prerender:
- `.do/app.yaml` env slots: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
  `CLERK_WEBHOOK_SECRET` → should be the Supabase vars above (+ `AT_*` already present
  for SMS). `MOBILE_API_KEY` is superseded by `SUPABASE_JWT_SECRET` for the mobile bridge.
- `.github/workflows/ci.yml` build step injects dummy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  / `CLERK_SECRET_KEY` → should inject dummy Supabase URL + anon key the Next 15
  prerender needs.
- `DEPLOYMENT-RUNBOOK.md` / `PRE-DEPLOY-CHECKLIST.md` still describe the Clerk webhook
  (`/api/webhooks/clerk`) and Clerk keys.
**Action:** update `.do/app.yaml` + `ci.yml` (and the runbook prose) to Supabase env
before any deploy, matching `.env.example`. Confirm against the actual `apps/web`
auth code (`lib/auth.ts`, `lib/supabase/*`, `middleware.ts`) — do not assume; verify.
Flag any remaining Clerk reference you cannot resolve rather than deploying over it.

## CI gate order (must pass, in this order)
`npm install` → `prisma generate` (`npm run generate --workspace @stawi/db`) →
`npm run typecheck` → `npm run lint` → `npm run test` (~242 core tests) →
`npm run build --workspace @stawi/web`. This is the order in `ci.yml`; keep it.
Deploy job runs only on `main` AND `vars.DEPLOY_ENABLED == 'true'` with DO secrets
present — otherwise it is skipped so CI stays green pre-launch.

## Deploy sequence (after Step 0)
1. **Postgres** — Managed PostgreSQL (fra1); `DATABASE_URL` with `?sslmode=require`.
2. **Migrate + RLS + seed** — `npm install`; `npm run -w @stawi/db generate`;
   `npm run -w @stawi/db migrate` (or `push`); `psql "$DATABASE_URL" -f
   packages/db/prisma/rls.sql`; optional `npm run -w @stawi/db seed`. Prod **requires**
   `DATABASE_URL` (mobile API returns 503 without it).
3. **Auth (Supabase)** — set Supabase project (Phone auth + Send-SMS hook →
   Africa's Talking), env vars per `.env.example`.
4. **M-Pesa (sandbox)** — `MPESA_ENV=sandbox`, consumer key/secret, passkey, shortcode
   `174379`, `MPESA_CALLBACK_URL=https://<app>/api/mpesa/callback`.
5. **Spaces** (fra1, CDN) for receipts; add CDN host to `next.config.mjs`.
6. **Stripe** — `STRIPE_SECRET_KEY`; webhook `/api/billing/webhook` →
   `STRIPE_WEBHOOK_SECRET`. Paystack/Flutterwave per country (stubs until keyed).
7. **Create app** — `doctl apps create --spec .do/app.yaml`; add all SECRET values in
   the DO dashboard (slots only in yaml, never commit values).
8. **GitHub Actions secrets** — `DIGITALOCEAN_ACCESS_TOKEN`, `DO_APP_ID`; set
   `DEPLOY_ENABLED=true` (repo variable) to arm auto-deploy.
9. **Domain** — `NEXT_PUBLIC_ROOT_DOMAIN=stawi.app`; CNAME + wildcard `*.stawi.app`
   for per-tenant subdomains; SSL auto-issued.
10. **Cron** — `CRON_SECRET` + repo secrets `CRON_URL` (`https://<app>/api/cron`),
    `CRON_SECRET`; `cron.yml` pings daily (interest accrual month-end, dunning daily).
11. **Verify** — `GET https://<app>/api/health` → `{"status":"ok"}`.

## Guardrails
- **Never commit secret values** — only env var *names* / slots.
- Reconcile Step 0 before deploying; a Clerk/Supabase mismatch breaks build + auth.
- Activate RLS per transaction (`SET app.tenant_id`) as part of go-live hardening.
- Rollback: DO → Deployments → previous build; DB → restore latest managed backup.
- Compliance/legal risk notes in PRE-DEPLOY-CHECKLIST apply per market — verify before
  launch.
