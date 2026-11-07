# Stawi — Deployment Runbook (Fly.io)

Target: **Fly.io**, app **`stawi`**, region **Frankfurt (`fra`)**, Next.js
standalone in Docker (`Dockerfile`, `fly.toml`). DigitalOcean is retired.

## How deploys work
- `.github/workflows/deploy.yml` — on every push to `main` it runs
  `flyctl deploy --remote-only` **only if the `FLY_API_TOKEN` repo secret exists**;
  otherwise the job passes with a "skipping" notice. On pull requests it only
  builds the Docker image (catches a broken Dockerfile before merge).
- `fly.toml` `release_command` → `packages/db/prisma/release.sh`: additive
  `prisma db push` (**never** `--accept-data-loss` — a destructive diff fails the
  release and the old version keeps serving), then re-applies `rls.sql`
  (idempotent). With no `DATABASE_URL` it skips.
- Health check: `GET /api/health` → `{"status":"ok"}` (Fly checks it every 30 s;
  the workflow confirms it after each deploy).

## One-time owner setup (values are never committed)
```bash
fly auth login
fly apps create stawi                      # org: your personal org
# Postgres — any managed Postgres works (e.g. Neon or Fly Postgres); keep sslmode=require
fly secrets set --app stawi \
  DATABASE_URL="postgresql://USER:PASSWORD@HOST/stawi?sslmode=require" \
  NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>" \
  SUPABASE_SEND_SMS_HOOK_SECRET="v1,whsec_<...>" \
  SUPABASE_JWT_SECRET="<jwt secret>" \
  AT_USERNAME="<...>" AT_API_KEY="<...>" AT_SENDER_ID="<optional>" \
  CRON_SECRET="<random>" \
  NEXT_PUBLIC_APP_URL="https://stawi.fly.dev" \
  NEXT_PUBLIC_ROOT_DOMAIN="stawi.fly.dev"
fly tokens create deploy --app stawi       # copy the token into GitHub (below)
```
GitHub → repo **Settings → Secrets and variables → Actions**:
- **Secrets:** `FLY_API_TOKEN` (arms auto-deploy), `CRON_URL`
  (`https://stawi.fly.dev/api/cron`), `CRON_SECRET` (same value as on Fly).
- **Variables** (public, inlined into the browser bundle at build time):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`.

Later blocks add their own secret names (M-Pesa, Play reviewer, assetlinks) —
the full list is in `.env.example` and `docs/PLAY-LISTING.md`.

## Secret / env NAMES (runtime, `fly secrets set`)
`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SEND_SMS_HOOK_SECRET`, `SUPABASE_JWT_SECRET`, `AT_USERNAME`, `AT_API_KEY`,
`AT_SENDER_ID`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`,
`MOBILE_API_KEY` (optional), `MPESA_*` (see `.env.example`), `STRIPE_SECRET_KEY` /
`STRIPE_WEBHOOK_SECRET` (optional), `MEMBER_EXPLANATION_PROVIDER` /
`ANTHROPIC_API_KEY` (optional). `SACCO_PLUS_ENABLED` is set to `"false"` in
`fly.toml` — v1 ships without lending.

## First deploy
1. Complete the one-time setup above.
2. Either push to `main` (workflow deploys) or run locally: `fly deploy --remote-only`
   with the four `--build-arg NEXT_PUBLIC_*=...` values.
3. Optional demo data: `npm run -w @stawi/db seed` then
   `npx tsx packages/db/prisma/seed-demo.ts` from a machine with `DATABASE_URL`.
4. Supabase: Auth → Hooks → Send SMS → `https://stawi.fly.dev/api/auth/send-sms`.
5. Verify: `curl https://stawi.fly.dev/api/health` → `{"status":"ok"}`.

## Rollback
- `fly releases --app stawi` then `fly deploy --image <previous image ref>`.
- DB: restore from the provider's latest backup (schema changes are additive only).

## Cron
`.github/workflows/cron.yml` calls `/api/cron` daily (subscription dunning;
SACCO+ interest accrual only when `SACCO_PLUS_ENABLED=true`). It skips until
`CRON_URL` is set.
