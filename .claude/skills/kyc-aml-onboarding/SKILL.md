---
name: kyc-aml-onboarding
description: Use when building or reviewing Stawi account opening, SACCO+ onboarding, loan eligibility/guarantors, or disbursement flows — per-entity KYC checklists, eligibility guard-rails, and dual-approval + audit-trail patterns tied to the Graduation Engine gates.
---

# KYC / AML & Onboarding

**Purpose:** Keep account opening and lending safe and auditable. Entity KYC,
guarantor/eligibility guard-rails, and dual-approval + immutable audit trail are
the same controls the Graduation Engine credits as the fixes for the documented
failure gaps (governance fraud, opaque lending).

## When to use
- Building/editing SACCO+ onboarding, KYC capture, loan application, guarantor, or
  disbursement-approval flows.
- Reviewing a money-admitting or money-releasing path for control gaps.

## Ground-truth files (read before editing)
- `packages/core/src/savings.ts` — `ENTITY_ONBOARDING` (per-entity required docs,
  min opening deposit, min share capital; registered groups are fast-tracked since
  their KYC lives in Pillar 1).
- `packages/core/src/credit.ts` — `scoreEligibility` (explainable determinants),
  `maxLoanCents` (deposit multiplier), guarantor coverage rule, instant-cap rule.
- `packages/core/src/graduation.ts` — `FAILURE_GAPS` (`governance` → dual approval +
  immutable audit trail + RBAC; `credit-risk` → deterministic scoring + guarantor
  coverage), stage governance flags.
- `packages/core/src/identity.ts` / `phone.ts` — phone-first identity (roster phone =
  identity; `phoneKey`/`phoneMatches`), `toE164`.
- `packages/core/src/charter.ts` — officials/designations (chairman, secretary,
  treasurer, signatory). Tests: `savings.test.ts`, `credit.test.ts`, `graduation.test.ts`.

## KYC checklists by entity (from `ENTITY_ONBOARDING`)
- **Individual:** National ID or passport; mobile-money-verified phone. Lowest
  opening deposit (barrier-to-enrol).
- **Registered group / chama (fast-track):** registration certificate + officials
  list auto-filled from the Formalization wizard; group resolution/minute to open
  the account.
- **Business:** registration/incorporation certificate; business tax PIN; ID of at
  least one director/owner.
- **Institution / union / organization:** certificate of registration; constitution/
  governing document; board resolution to open; signatories list with IDs. Highest
  opening deposit + share capital.

Collect the entity's `requiredDocs`, enforce `minOpeningDepositCents` and
`minShareCapitalCents` (integer cents), and verify the phone line before linking
(`identity.ts`). Add the market's DPA basis for storing ID data (see
`compliance-pack`).

## Loan guarantor / eligibility guard-rails
- Score with `scoreEligibility` — deterministic and explainable; every point and
  every block is written to `reasons` (this replaces the opaque loan committee).
- Hard blocks: below `minMembershipMonths`; unresolved default on record; request
  over the deposit-multiplier limit; score below the 45-point approval floor.
- **Security:** for non-instant products, borrower deposits + guarantor free
  deposits must cover the loan before approval. Instant products auto-disburse only
  under `instantCapCents` without guarantors.

## Dual-approval + audit-trail pattern
- **No autonomous disbursement.** Every disbursement (and any manual money move)
  requires dual approval — two authorised officials — before funds release. This is
  the `governance` gap fix.
- **Immutable audit trail.** Record who proposed, who approved, when, the amount
  (integer cents), and the decision inputs (eligibility score + reasons). Treasurer
  actions are visible to all members in real time.
- **RBAC.** Gate approval by role (`tenantRoleAtLeast`, charter designations); the
  proposer cannot be the sole approver.
- Tie readiness to the Graduation Engine: `governance.dualApprovalEnabled` and
  `auditTrailEnabled` are checked gates for SACCO / DT-SACCO stages — onboarding and
  lending flows should set them truthfully, never fake-pass them.

## Guardrails
- Propose, don't dispose — flows surface a decision for human approval; code never
  releases money on its own.
- Integer cents on every amount; fail closed on missing KYC or uncovered loans.
- KYC document handling follows the market's data-protection regime (Kenya DPA etc.).
- Nothing here is legal/financial advice; route regulatory questions to `legal-agent`.
