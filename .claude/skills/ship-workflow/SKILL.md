---
name: ship-workflow
description: Use when implementing a backlog slice, fixing a bug, or preparing to commit/deploy Stawi — the house delivery loop: CI gate order, deploy gated on DEPLOY_ENABLED, keep the ~242 core tests green, update MEMORY.md/HANDOFF, one focused PR at a time.
---

# Ship Workflow

**Purpose:** The house delivery loop for Stawi. Keep the build green, ship small
coherent changes, and leave the context (MEMORY/HANDOFF) accurate for the next
session.

## When to use
- Implementing a feature/backlog slice, fixing a bug or regression, refactoring.
- Preparing a commit or PR, or handing off at end of session.

## Ground-truth files
- `MEMORY.md` — session log + "RESUME HERE" pointer (read first; the auth migration
  is logged here — see `do-deploy-runbook` for the deploy-config drift it creates).
- `HANDOFF-v1.9.md` — latest handoff state.
- `.github/workflows/ci.yml` (gate order + gated deploy), `PRE-DEPLOY-CHECKLIST.md`.
- `README.md`, `PRD.md` — product truth.
- `.claude/agents/operation-agent.md` — the engineer persona + house constraints.

## The loop
1. **Confirm scope.** Read `MEMORY.md` "RESUME HERE" + the relevant module and its
   `@stawi/core` helpers before editing. Plan-first on anything non-trivial. One
   focused change at a time.
2. **Build the vertical slice.** Match house style: integer cents, tenant-scoped
   queries, pure deterministic core logic, the "warm savanna fintech" tokens
   (`stawi-design-system`). Add/extend Vitest tests in `packages/core` for new logic.
3. **Verify — the CI gate, in order:**
   `npm install` → `npm run generate --workspace @stawi/db` (prisma) →
   `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build --workspace
   @stawi/web`. All green. The ~242 core tests are the contract — never leave them red.
   (The project folder can be a sync mount that truncates large writes and makes
   npm/git flaky — after a non-trivial write, verify with `wc -l` + a parse; if
   truncated, write to the scratchpad then copy in and re-verify.)
4. **Document in the same change.** Update `MEMORY.md` (dated session note + move the
   "RESUME HERE" pointer) and `HANDOFF` on completion; update `PRD.md`/`README.md` if
   behaviour changed.
5. **Ship one focused PR.** Clear message; exclude line-ending-only churn. Deploy is
   gated: the CI deploy job runs only on `main` AND repo variable
   `DEPLOY_ENABLED == 'true'` with DO secrets present — so pushing before launch keeps
   CI green without deploying. Arm deploy only when intended (see `do-deploy-runbook`).

## Guardrails
- Tests green before "done" — reproduce a bug before claiming a fix.
- Integer cents; tenant isolation on every query; fail closed on safety/money paths —
  these are acceptance criteria (see `money-movement-testing`, `tenant-isolation-guard`).
- Never commit secrets; env var names only.
- Keep changes reviewable: small, coherent, well-described.
- Only commit/push when the user asks; branch first if needed.
