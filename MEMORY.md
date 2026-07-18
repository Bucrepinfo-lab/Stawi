# Stawi — session memory / start-here

> **STATUS: v1.9 consolidated as Pillar 1 + SACCO+ opt-in activation added (2026-07-18).**
> The Desktop `Chamaa App` folder (7 duplicate snapshots) was consolidated into this repo —
> v1.9-import-notes promoted as the single source of truth, duplicates removed.
> Backup of all snapshots: `ChamaaApp-backup.tar.gz` (in the Cowork outputs folder).
> v1.9 adds: import written notes (photo/file → OCR/parse → minutes) + per-country phone length.
> **KNOWN RED:** `graduation.test.ts` ("readiness rises as gaps close") fails — pre-existing bug in
> `graduation.ts` readinessPct scoring; this is the failing GitHub CI job. Fix before deploy.

## Restructure log (2026-07-18)
- Promoted `Chamaa App/Stawi-v1.9-import-notes` → repo root (superset of prior main; no pillars lost).
- Removed all 7 `Chamaa App/*` snapshots + `OCR-Import-Kit` (already folded into `intake.ts`).
- **New: Pillar 1 → Pillar 4 activation bridge.** `packages/core/src/sacco-activation.ts`
  (`buildSaccoActivation`, `activationEvidence`, `memberSavingsProfiles`, `activationCreditPreview`,
  `isActivationReady`) + `test/sacco-activation.test.ts` (9 tests, green). Turns a Pillar-1-only
  group's captured record into a one-tap SACCO+ join with lender-evidence checklist, member savings
  history and pre-qualified credit.
- **Dashboard:** new **SACCO+ tab** in `apps/web/app/groups/[id]/GroupCockpit.tsx` +
  `activateSaccoFromPillar1Action` server action (opens account, seeds pooled savings).
- Core suite: 200 pass / 1 fail (the graduation bug above). See doc: `docs/PILLAR-1-COCKPIT.md`.

## Repo
- GitHub: `Bucrepinfo-lab/Stawi` (public). Base commit on origin: `46bf634`.
- Local history to push (patches in the Desktop handoff folders):
  `1018ea0` pillar-1 cockpit · `419625b` phone-first identity · `f10851e` mobile Expo ·
  `9ed18fe` mobile live API · `b00c231` Postgres + Clerk mobile auth · + this lock-up commit.
- Turborepo: `apps/web` (Next 15), `apps/mobile` (Expo/RN), `packages/core`, `packages/db`.

## What's built (Pillar 1 — the data-entry cockpit that feeds Pillars 2–4)
- **Core (pure, tested):** `charter.ts`, `minutes.ts`, `minutes-prose.ts` (deterministic
  informal→formal minute paraphraser), `statement.ts` (month-end reconcile), `identity.ts`
  (phone match / groups-by-phone). Tests: charter/minutes/statement/identity.
- **Web:** `/groups/[id]` cockpit (Charter · Minutes · Documents · Month-End), `/groups/new`,
  role-gated; phone-first sign-in/up; JSON API `apps/web/app/api/mobile/*`.
- **Mobile (Expo):** phone login (demo + Clerk OTP), groups-by-phone, full cockpit,
  Table banking, SACCO+; `lib/api.ts` (live ⇄ offline seed), Live/Offline pill.
- **DB (live-on-key):** `GroupCharter`/`Meeting`/`MonthlyStatement` + phone-keyed
  memberships; repo helpers; RLS; seed creates Umoja charter + 2 meetings + phones.
- **Auth:** phone-first. Clerk optional on mobile (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`),
  verified server-side (`@clerk/backend` + `CLERK_SECRET_KEY`). API auth precedence:
  Clerk bearer → `MOBILE_API_KEY` → open (dev only).
- **Production rule:** `DATABASE_URL` REQUIRED; no seed fall-back in prod (API → 503).

## Key env
Web: `DATABASE_URL`, `CLERK_*`, `MOBILE_API_KEY`, `MPESA_*`, `STRIPE_*`, `CRON_SECRET`.
Mobile (`apps/mobile/.env`): `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_API_KEY`. See `.env.example`, `DB-SETUP.md`, `.do/app.yaml`.

## Verification note
Core logic unit-verified; all TS/TSX syntax-clean; imported symbols confirmed.
Sandbox cannot run `npm run build`/Expo/Postgres (blocked binaries) — those gates
run on Jacob's machine / DO.
