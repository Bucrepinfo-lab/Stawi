# Owner standing rules — Stawi

Adopted 25/10/26 from the Telpen Edu standing rules (owner, 24/10/26), adapted to
this repo. They bind every contributor and every agent (human-run or scheduled).
Where a repo skill is more specific, the skill decides *how*; these rules decide
*whether*.

## 1. Live stays live — fix forward
A live country, group or SACCO is never taken offline because a check, test or audit fails. Do not
switch off a CountryProfile, a group's graduation stage, or a tenant's subscription state to make a check pass. A failure is escalated to the
responsible agent, who identifies the bug, fixes it, retests and redeploys.

## 2. Fix once, fix everywhere
A bug fixed in one place is fixed and confirmed in every country (CountryProfile) and tenant group (SHG, chama, SACCO), web and mobile app. Add or adjust a
regression test that would have caught it, and make sure the fix does not change
any other country's or tenant's output.

## 3. Escalate, don't fix
Stop and ask the owner instead of fixing when a fix would touch any of:

- money: M-Pesa, payments, billing, savings, credit, capital, interest/dividends, accounting, statements and receipts: `apps/web/lib/{mpesa,billing}.ts`, `apps/web/app/api/{mpesa,billing}/`, `packages/core/src/{mpesa,payments,plans,savings,credit,capital,accounting,statement,receipt,rotation,pos,tiers}.ts`
- tax, compliance, KYC and SACCO rules: `packages/core/src/{tax,compliance,identity,formalization,graduation,sacco-activation,charter}.ts`, `legal/`, `COMPLIANCE.md`
- sign-in and tenancy: `apps/web/lib/auth.ts`, `apps/web/app/api/auth/`, `packages/core/src/tenancy.ts`, `TENANCY.md`
- database and RLS: `packages/db/` (schema, `rls.sql`)
- deploy config and secrets: `.github/`, `.do/`, `docker-compose.yml`, any `Dockerfile`, any `.env*`

…or a policy or approval decision, a risky (non-additive) database change, or
after **three** failed fix attempts. Automated fixes go on a
`fix/health-audit-<dd-mm-yy>` branch, and the **Health audit guard** check
(`.github/workflows/health-audit-guard.yml`) fails the PR if it touches a
protected area or weakens a test. A red guard is never worked around: no branch
rename, no splitting the change, no editing the guard in the same PR. Leave the PR
open and escalate.

## 4. Tests are never weakened
Never delete, skip (`.skip`, `.todo`, `xit`), or narrow (`.only`) a test to get a
pass. Fix the code, or escalate.

## 5. Ship small, ship proven
- One fix per PR; P0 (safety, money, data) before P1. No line-ending-only churn.
- Merge only when every check is green **at the exact head SHA**.
- Deploy: CI deploys to DigitalOcean App Platform only on `main` with `DEPLOY_ENABLED == 'true'` (see `do-deploy-runbook`). Confirm it is serving: `/api/health` on the web app returns `{"status":"ok"}`. A skipped deploy is not
  "shipped" — say so plainly.
- Name the exact screens a human should retest (and at 375 px phone width).
- Update `MEMORY.md` (and the current `HANDOFF-*.md`) in the same change.
- The owner authorises merges and manual deploys unless a written rule delegates it.

## 6. Money is human-authorised only
Agents and automation prepare, propose and reconcile; they never move money,
trigger a charge, payout or refund, or change pricing. See `money-movement-testing`.

## 7. Data is protected
Schema changes are additive only; re-apply `rls.sql` after a push (`tenant-isolation-guard`). Never use `--accept-data-loss`, `--force-reset` or
a reset against a shared or production database.

## 8. Secrets stay secret
Never print, paste, log or commit a secret, token or key (or a URL containing
one). A leaked one is revoked and reminted by the owner.

## 9. Each country is its own
Every country keeps its own currency, wording, compliance rules and clock: no
country mixing, nothing unapproved leaking in, tenant isolation always holds.
Schedules, reminders and escalation alerts run on the country's own time zone and
escalate when unresolved.

## 10. Screens work on phones
Key screens have no crashes, error pages or console errors, and work at 375 px.

## 11. Owner-facing reports
Owner reports and alerts use dd/mm/yy dates in Africa/Nairobi time, lead with what
needs a decision, and never include customer names, phones or emails. Existing
logs keep their own date format.

## 12. Schedules cost minutes
Each scheduled workflow states why its frequency is needed; prefer the least
frequent schedule that meets the need (GitHub Actions minutes are a budget).
