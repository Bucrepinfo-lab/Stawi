---
name: money-movement-testing
description: Use when touching any Stawi money code — savings/credit/dividend/interest accrual, loan amortization, M-Pesa STK or callbacks, or any ledger write — to enforce integer-cents, reducing-balance correctness, idempotency, and the propose-not-dispose rule with Vitest invariants.
---

# Money-Movement Testing

**Purpose:** Money code is the highest-risk code in Stawi. This skill fixes the
invariants to assert and the Vitest patterns to use so a rounding slip, a
double-credit, or a bad callback can never ship. Pure domain logic lives in
`@stawi/core` and is tested without network.

## When to use
- Editing `savings.ts`, `credit.ts`, `tiers.ts`, `capital.ts`, `accounting.ts`,
  `statement.ts`, `payments.ts`, `mpesa.ts`, or any `packages/db` ledger write.
- Adding a loan product, interest/dividend rule, or a new M-Pesa flow.
- Reviewing a PR that moves money.

## Ground-truth files (read before editing)
- `packages/core/src/savings.ts` — `applySaccoTxn`, `availableCents`,
  `monthlyDepositInterestCents` (10% p.a.), `annualDividendCents` (13%),
  `remittanceFeeCents`, `liquidityStatus` (15% SASRA floor).
- `packages/core/src/credit.ts` — `scoreEligibility` (0–100, explainable),
  `maxLoanCents`, `amortizeReducingBalance` (annuity, final row absorbs rounding).
- `packages/core/src/mpesa.ts` — `stkAmountFromCents`, `buildStkPushPayload`,
  `parseStkCallback` (ResultCode 0 = success).
- Tests: `test/savings.test.ts`, `test/credit.test.ts`, `test/mpesa.test.ts`.
- `npm run test` (root, turbo) or `vitest run` in `packages/core`. Keep the full
  core suite (~242 tests) green.

## Invariants to assert
**Integer cents everywhere.** Every amount is an integer of minor units. Assert
`Number.isInteger(x)` on every money output. Never introduce a float path; reject
non-integer/negative inputs (as `applySaccoTxn` already does).

**Reducing-balance amortization** (`amortizeReducingBalance`):
- Sum of `principalCents` across rows === original `principalCents` exactly.
- Final row `balanceCents === 0` (final instalment absorbs rounding).
- `totalPaidCents === principalCents + totalInterestCents`.
- Interest each month === `round(balance * monthlyRate)`, charged on the
  outstanding balance only. Zero-rate and 1-month edge cases return clean schedules.

**Interest / dividend accrual is idempotent.** Accrual for a given period must be
keyed so re-running the cron (`/api/cron`, month-end) cannot double-credit. Test:
applying the same period twice yields one credit, not two. Rounding is `Math.round`
to the nearest cent (match savings.ts); assert the direction on boundary values.

**Liquidity guard-rail** (`liquidityStatus`): ratio never lets a withdrawal/lend
push below the 15% floor; `shortfallCents` is correct and never negative.

**Eligibility scoring** (`scoreEligibility`): deterministic — same input → same
score, tier, and `reasons`. Blocked paths (tenure, default history, over-limit,
uncovered-by-guarantors) return `qualified: false` with a reason string.

**M-Pesa STK:** `stkAmountFromCents` rounds cents → whole shillings and throws on
≤0. Password = base64(shortcode+passkey+timestamp). `AccountReference` ≤12 chars,
`TransactionDesc` ≤13. `parseStkCallback` treats only ResultCode 0 as success;
cancelled/timeout/malformed callbacks are failures, never a credit.

**Callback correctness / persistence:** STK is pending→confirmed. A confirmed
credit must be tied to `CheckoutRequestID` + M-Pesa receipt so a duplicate callback
is a no-op (idempotent). Test replayed callbacks credit once.

## Guardrails
- **Propose, don't dispose.** No autonomous money movement. Disbursements require
  dual approval (the governance gap the Graduation Engine closes); code proposes a
  transaction for human approval and an immutable audit trail — it never silently
  moves funds.
- Fail closed: on any ambiguous callback/amount, do not credit.
- Add or extend a Vitest test for every money rule you touch; run the suite before
  claiming done. Money bugs are acceptance-criteria failures, not nits.
