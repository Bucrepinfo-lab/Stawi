# Stawi — database setup (persist writes end-to-end)

Without `DATABASE_URL` the app runs on seed data (reads work, writes are no-ops).
Set a Postgres URL and the cockpit (charter, minutes, month-end) and phone-first
membership linking persist for real.

## Option A — local Postgres (Docker), fastest
```bash
docker compose up -d                      # starts Postgres on :5432
export DATABASE_URL="postgresql://stawi:stawi@localhost:5432/stawi?schema=public"

npm install
npm run -w @stawi/db generate             # prisma client
npm run -w @stawi/db push                 # create tables from schema.prisma
psql "$DATABASE_URL" -f packages/db/prisma/rls.sql   # row-level security (optional locally)
npm run -w @stawi/db seed                 # demo tenant + Umoja + charter + 2 meetings

npm run dev                               # web + API read/write the DB
```
Point the mobile app at this API: set `apps/mobile/.env` →
`EXPO_PUBLIC_API_BASE=http://<your-LAN-IP>:3000`, then
`npm run start --workspace @stawi/mobile`. Sign in with **0712345678** (Amina) —
groups now come from Postgres, and Save draft / Post write back to it.

## Option B — managed Postgres for production (Fly.io app)
1. Create a managed Postgres database in an EU region (e.g. Neon or Fly Postgres).
   Set its URL on Fly: `fly secrets set --app stawi DATABASE_URL="...?sslmode=require"`.
2. Nothing else to run by hand: every deploy's release command
   (`packages/db/prisma/release.sh`) runs an **additive** `prisma db push` (never
   `--accept-data-loss`) and re-applies `rls.sql`.
3. `npm run -w @stawi/db seed` (optional — demo tenant), then
   `npx tsx packages/db/prisma/seed-demo.ts` for the Play reviewer member.
See `DEPLOYMENT-RUNBOOK.md`.

## What persists now
`GroupCharter`, `Meeting`, `MonthlyStatement` (Pillar 1), plus phone-keyed
`Membership` rows so a member signing in with their roster number is auto-linked.
The mobile JSON API (`/api/mobile/*`) writes through the same repo helpers.
