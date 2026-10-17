---
name: sacco-graduation-domain
description: Use when changing Stawi's SACCO+ domain — the 8 failure gaps, graduation-stage prudential thresholds, savings/dividend/loan product rules, or credit-tier logic — so changes stay consistent with the productized chama→listed model.
---

# SACCO Graduation Domain

**Purpose:** The reference for Pillar 4's productized model. Stawi carries a group
up a ladder (chama → listed institution) and measures it against research-backed
prudential gates. Use this to keep any edit to savings, credit, tiers, or
graduation internally consistent and member-explainable.

## When to use
- Editing `graduation.ts`, `savings.ts`, `credit.ts`, `tiers.ts`, or `capital.ts`.
- Adding a loan/savings product, changing a rate, or adjusting a prudential threshold.
- Building UI that surfaces the ladder, gap report, ratios, or tier perks.

## Ground-truth files (read before editing)
- `packages/core/src/graduation.ts` — `GraduationStage` ladder, `FAILURE_GAPS`,
  `GraduationInput`, `assessGraduation`, stage checks + ratios.
- `packages/core/src/savings.ts` — deposit interest 10% p.a., dividend 13%,
  remittance fees, 15% liquidity floor (`MIN_LIQUIDITY_RATIO_PCT`).
- `packages/core/src/credit.ts` — 3 loan products, explainable score, risk tiers.
- `packages/core/src/tiers.ts` — party-level credit tiers (Seed/Sprout/Harvest/Mkubwa).
- Tests: `graduation.test.ts`, `savings.test.ts`, `credit.test.ts`, `tiers.test.ts`.
- `PRD.md` §6 (sources), `COMPLIANCE.md`, `BRAND.md` (four pillars).

## The 8 failure gaps → Stawi fix (`FAILURE_GAPS`)
1. **governance** — insider fraud / weak boards → dual approval, immutable audit
   trail, RBAC, treasurer actions visible live.
2. **liquidity** — runs / breaching the 15% floor → live liquidity meter + lending
   brake near the floor.
3. **capital** — thin core capital → share-capital tracking, retained-earnings view,
   capital-adequacy gauge vs the next stage's threshold.
4. **records** — unauditable books → double-entry digital from day one (Pillars 1+3).
5. **credit-risk** — opaque lending / high NPLs → deterministic eligibility scoring,
   savings-multiplier limits, enforced guarantor coverage.
6. **cost-base** — ballooning branch/paper/wage costs → branchless by design.
7. **education** — uninformed, dormant members → member-visible ratios, plain-language
   statements, next-step nudges.
8. **compliance** — regulatory non-compliance → country-aware compliance packs,
   filing reminders, stage-gated checklists.

## Graduation ladder + prudential thresholds (`assessGraduation`)
Stages: CHAMA → SELF_HELP_GROUP → SACCO → DEPOSIT_TAKING_SACCO → MICROFINANCE_BANK →
COMMERCIAL_BANK → LISTED. Current stage = highest stage whose checks all pass; the
assessment returns the NEXT stage's checks as the member-visible gap report +
`readinessPct`. Ratios: capital adequacy = coreCapital/totalAssets; liquidity =
liquidAssets/totalDeposits; NPL = nonPerformingLoans/grossLoans.
Key gates (keep these consistent — verify against current SASRA/CBK law before
relying on them as legal thresholds):
- SELF_HELP_GROUP: ≥10 members, elected officials, registered.
- SACCO: ≥10 members, audit trail, registered, ≥1 audited year.
- DT-SACCO: liquidity ≥15%, core capital ≥10%, NPL ≤5%, dual approval, ≥2 audited
  years, ≥500 members.
- MICROFINANCE_BANK: capital ≥12%, liquidity ≥20%, NPL ≤5%, ≥3 audited years, ≥2
  profitable years, ≥5,000 members.
- COMMERCIAL_BANK: capital ≥14.5%, liquidity ≥20%, NPL ≤5%, ≥5 audited years, ≥3
  profitable years, annual external audit.
- LISTED: 5-year track record, net profit last 2 years, full governance stack,
  ≥25,000 members.

## Savings / dividend / loan product rules
- Deposit interest **10% p.a.** (`monthlyDepositInterestCents`), share dividend
  **13% p.a.** (`annualDividendCents`). Share capital is non-withdrawable, earns
  dividends, absorbs losses; pledged balance is locked; `availableCents` = balance −
  pledged. All integer cents.
- Loans: **DEVELOPMENT** (1%/mo, 3× deposits, 36mo), **EMERGENCY** (1.5%/mo, 0.5×,
  6mo, instant cap 50,000 units, no guarantor under cap), **BUSINESS_BOOST** (1.2%/mo,
  3×, 24mo). Reducing-balance amortization; rate = product base + tier premium.
- Risk tiers A/B/C/DECLINE from the 0–100 score (floor 45); premiums A:0, B:0.25,
  C:0.5 (monthly %).

## Credit tiers (party-level, `tiers.ts`)
Seed → Sprout → Harvest → Mkubwa, each unlocking concrete perks (higher deposit
multiplier, rate discount, bigger instant cap, longer term). `graduation.ts` tracks
the *institution*; `tiers.ts` tracks each *party* (member/group/business).

## Guardrails
- Keep every threshold/rate machine-checkable and member-explainable — the product's
  value is transparency; don't hide determinants.
- Prudential thresholds are modelled defaults aligned to SASRA/CBK guidance — flag
  "verify against current local law" before treating them as legal requirements
  (see `compliance-pack`).
- Integer cents everywhere; changes to money rules go through `money-movement-testing`.
- Keep the ~242 core tests green; add a test for any rule you change.
