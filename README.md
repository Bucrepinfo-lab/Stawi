# Stawi 🇰🇪

**Save together. Grow together. Run the business.**

Stawi carries a savings group across its full journey: from the merry-go-round
(table banking) → a registered self-help group / SACCO → a matched business →
running that business with QuickBooks-grade accounting and Kenyan tax compliance.
Mobile-first and M-Pesa-native.

> Status: **v0.1 — foundation.** Pillar 1 (Table Banking) core logic + M-Pesa
> Daraja STK Push are implemented and tested (45 unit tests). See [`PRD.md`](./PRD.md)
> for the full spec and roadmap.

## M-Pesa (Daraja sandbox)

- Pure helpers (payload, password, phone normalisation, callback parsing) live in
  `@stawi/core` (`mpesa.ts`) and are fully unit-tested.
- HTTP client: `apps/web/lib/mpesa.ts` (OAuth + STK Push).
- Routes: `POST /api/mpesa/stk` (treasurer initiates a collection) and
  `POST /api/mpesa/callback` (Safaricom confirms — public, always 200s).
- Set `MPESA_*` in `.env` (sandbox first). Test payer: `254708374149`.
- Persisting PENDING→CONFIRMED contributions is wired as `TODO`s pending
  `DATABASE_URL` (schema already in `@stawi/db`).

## The three pillars

1. **Table Banking → Registered Group** — rotating contributions, treasurer
   payments that fan out live to every member's dashboard, a real-time
   capital-ratio calculator, M-Pesa, downloadable receipts, and a formalization
   wizard (SHG/SACCO under Kenyan law).
2. **Capital-to-Business Matching** — enter capital + industry, generate ventures
   that fit, re-roll, and save 3 ideas to compare.
3. **Accounting + Compliance + Admin** — daily P&L, reconciliation (D/W/M/Y),
   dead-stock analysis, supplier alerts, Kenya tax auto-calc (VAT, PAYE, levies),
   and a constituency → county → national → continental → global → super-admin
   sales hierarchy.

## Monorepo layout

```
apps/
  web/        Next.js 15 (App Router) — member + admin web app
  mobile/     Expo / React Native — member app (own design system, no UI kits)
packages/
  core/       Domain logic (capital ratio, rotation, tax, matching) — 31 unit tests
  db/         Prisma schema + client (PostgreSQL)
```

## Stack

Next.js · React Native (Expo) · Clerk (auth/orgs/roles) · PostgreSQL (Prisma) ·
M-Pesa Daraja 3.0 · DigitalOcean App Platform (fra1) · Turborepo.

## Quick start

```bash
npm install
cp .env.example .env          # fill in Clerk + DB + M-Pesa (sandbox) keys
npm run test                  # run the core unit tests (31 passing)
npm run dev                   # web on http://localhost:3000
```

Mobile:

```bash
npm run start --workspace @stawi/mobile   # Expo
```

## Design language

"Warm savanna fintech" — deep forest-green ink, amber-gold signal, clay accent on
a bone background. Fraunces (display) × Hanken Grotesk (body) × IBM Plex Mono
(money figures). See `design/stawi-prototype.html` for the interactive reference.

## Deploy

DigitalOcean App Platform via `.do/app.yaml` (Frankfurt). CI/CD in
`.github/workflows/ci.yml`. Full steps in [`DEPLOYMENT-RUNBOOK.md`](./DEPLOYMENT-RUNBOOK.md).

## License

Proprietary — © Bucrep / Jacob. All rights reserved.
