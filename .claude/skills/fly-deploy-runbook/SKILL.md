---
name: fly-deploy-runbook
description: Use when deploying Stawi to Fly.io or editing deploy config (Dockerfile, fly.toml, deploy.yml, release.sh) — the deploy is gated on the FLY_API_TOKEN secret, schema sync is additive-only db push + RLS re-apply, and health is /api/health. DigitalOcean is retired.
---

# Fly.io deploy runbook

**Ground truth:** `DEPLOYMENT-RUNBOOK.md`, `Dockerfile`, `fly.toml`,
`.github/workflows/deploy.yml`, `packages/db/prisma/release.sh`, `.env.example`.

## Rules
- App `stawi`, region `fra`, internal port 3000, health `GET /api/health` → `{"status":"ok"}`.
- `deploy.yml` deploys `main` only when `secrets.FLY_API_TOKEN` exists; otherwise it
  passes with a notice. A skipped deploy is **not** shipped — say so plainly.
- `release.sh` runs `prisma db push` **without** `--accept-data-loss` and then
  `rls.sql`. Never add that flag, `--force-reset`, or a reset.
- `NEXT_PUBLIC_*` are build args from repo **Variables** (public); everything else is
  a runtime `fly secrets set` value. List secret NAMES only — never print values.
- `SACCO_PLUS_ENABLED` stays `"false"` in `fly.toml` until the owner has a CBK licence.
- After a deploy: confirm `/api/health`, then name the screens to retest at 375 px.
