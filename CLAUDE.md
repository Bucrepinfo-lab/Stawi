# Stawi — repo guide

SHG → chama → SACCO+ platform (npm workspaces + Turborepo): `apps/web` (Next.js),
`apps/mobile`, `packages/core` (domain + money logic, tests in `packages/core/test`),
`packages/db` (Prisma, `rls.sql`). Start here: `MEMORY.md`, the latest
`HANDOFF-*.md`, `PRD.md`, `TENANCY.md`, `COMPLIANCE.md`.

## Owner standing rules
Read `docs/STANDING_RULES.md` first — it binds every contributor and agent:
live stays live (fix forward); fix once, fix everywhere (every country, group
and app); escalate, don't fix, in protected areas (M-Pesa, payments, savings,
credit, capital, accounting, tax/compliance/KYC, sign-in, tenancy, database/RLS,
deploy config, secrets) or after three failed attempts; never weaken a test;
merge only green at the exact head SHA; propose, never dispose, money.

## The gate (see the `stawi:ship-workflow` skill)
```
npm install
npm run generate --workspace @stawi/db
npm run typecheck && npm run lint && npm run test && npm run build --workspace @stawi/web
```
Deploy: DigitalOcean App Platform, only on `main` with `DEPLOY_ENABLED == 'true'`
(`do-deploy-runbook`). Confirm `/api/health` → `{"status":"ok"}`.

## Skills
`.claude/skills/`: `ship-workflow`, `tenant-isolation-guard`, `money-movement-testing`,
`kyc-aml-onboarding`, `compliance-pack`, `sacco-graduation-domain`,
`do-deploy-runbook`, `stawi-design-system`. UTF-8 + LF only. Commit/push only when asked.
