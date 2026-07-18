/**
 * Credit engine — Pillar 4 (Stawi SACCO+).
 *
 * System-intelligent lending with minimal human involvement: loan products,
 * a transparent eligibility score (the "qualifiable determinants"), savings-
 * multiplier limits, guarantor coverage, and reducing-balance amortization
 * at rates benchmarked against the most competitive Kenyan DT-SACCOs
 * (1%/month reducing balance ≈ Stima/Hazina class).
 *
 * All money is integer minor units (cents). Pure functions only.
 */

export type LoanProductId = 'DEVELOPMENT' | 'EMERGENCY' | 'BUSINESS_BOOST';

export interface LoanProduct {
  id: LoanProductId;
  name: string;
  blurb: string;
  /** Base monthly interest %, reducing balance. */
  baseMonthlyRatePct: number;
  /** Max loan as a multiple of member deposits. */
  depositMultiplier: number;
  maxTermMonths: number;
  /** Instant products auto-disburse below this cap without guarantors. */
  instantCapCents: number | null;
  minMembershipMonths: number;
}

export const LOAN_PRODUCTS: Record<LoanProductId, LoanProduct> = {
  DEVELOPMENT: {
    id: 'DEVELOPMENT',
    name: 'Development loan',
    blurb: 'Long-term projects — land, housing, education. Up to 3× your deposits.',
    baseMonthlyRatePct: 1.0,
    depositMultiplier: 3,
    maxTermMonths: 36,
    instantCapCents: null,
    minMembershipMonths: 3,
  },
  EMERGENCY: {
    id: 'EMERGENCY',
    name: 'Instant emergency loan',
    blurb: 'Scored and disbursed by the system in minutes, day or night.',
    baseMonthlyRatePct: 1.5,
    depositMultiplier: 0.5,
    maxTermMonths: 6,
    instantCapCents: 5_000_000, // 50,000 units
    minMembershipMonths: 1,
  },
  BUSINESS_BOOST: {
    id: 'BUSINESS_BOOST',
    name: 'Business boost loan',
    blurb: 'Working capital for a venture matched in Pillar 2 or running in Pillar 3.',
    baseMonthlyRatePct: 1.2,
    depositMultiplier: 3,
    maxTermMonths: 24,
    instantCapCents: null,
    minMembershipMonths: 3,
  },
};

/** The qualifiable determinants a member is scored on — all machine-checkable. */
export interface EligibilityInput {
  monthsActive: number;
  depositsCents: number;
  /** Consecutive months with at least one deposit. */
  savingStreakMonths: number;
  /** 0–1 share of past instalments paid on time (1 if no loan history). */
  onTimeRepaymentRate: number;
  existingLoanBalanceCents: number;
  /** Cents of the requested loan covered by guarantors' free deposits. */
  guarantorCoverageCents: number;
  hasDefaultHistory: boolean;
}

export type RiskTier = 'A' | 'B' | 'C' | 'DECLINE';

export interface EligibilityResult {
  score: number; // 0–100
  tier: RiskTier;
  /** Personalised monthly rate: base + risk premium. */
  monthlyRatePct: number;
  maxLoanCents: number;
  reasons: string[];
  qualified: boolean;
}

/** Risk premium (monthly %) added to the product base rate per tier. */
export const TIER_PREMIUM_PCT: Record<Exclude<RiskTier, 'DECLINE'>, number> = {
  A: 0,
  B: 0.25,
  C: 0.5,
};

/** Max loan for a product given deposits, net of any running balance. */
export function maxLoanCents(
  product: LoanProduct,
  depositsCents: number,
  existingLoanBalanceCents = 0,
): number {
  return Math.max(
    0,
    Math.floor(depositsCents * product.depositMultiplier) - existingLoanBalanceCents,
  );
}

/**
 * Score a member for a requested loan. Deterministic and explainable —
 * every point gained or lost is written into `reasons` so the member can
 * see exactly how to improve (this replaces the opaque loan committee).
 */
export function scoreEligibility(
  product: LoanProduct,
  requestedCents: number,
  input: EligibilityInput,
): EligibilityResult {
  const reasons: string[] = [];
  let score = 0;

  // 1) Membership tenure (max 15)
  if (input.monthsActive >= product.minMembershipMonths) {
    const pts = Math.min(15, 5 + input.monthsActive);
    score += pts;
    reasons.push(`+${pts} membership tenure (${input.monthsActive} months)`);
  } else {
    reasons.push(
      `Blocked: needs ${product.minMembershipMonths} months of membership, has ${input.monthsActive}.`,
    );
    return declined(product, input, requestedCents, reasons);
  }

  // 2) Saving consistency (max 25)
  const streakPts = Math.min(25, input.savingStreakMonths * 3);
  score += streakPts;
  reasons.push(`+${streakPts} saving streak (${input.savingStreakMonths} consecutive months)`);

  // 3) Repayment behaviour (max 30)
  if (input.hasDefaultHistory) {
    reasons.push('Blocked: unresolved default on record.');
    return declined(product, input, requestedCents, reasons);
  }
  const repayPts = Math.round(30 * clamp01(input.onTimeRepaymentRate));
  score += repayPts;
  reasons.push(`+${repayPts} on-time repayment history (${Math.round(clamp01(input.onTimeRepaymentRate) * 100)}%)`);

  // 4) Capacity — requested vs limit (max 20)
  const limit = maxLoanCents(product, input.depositsCents, input.existingLoanBalanceCents);
  if (limit <= 0 || requestedCents > limit) {
    reasons.push(
      `Blocked: request exceeds the ${product.depositMultiplier}× deposit limit (max ${limit} cents).`,
    );
    return declined(product, input, requestedCents, reasons);
  }
  const headroom = 1 - requestedCents / limit; // more headroom = safer
  const capPts = Math.round(10 + 10 * headroom);
  score += capPts;
  reasons.push(`+${capPts} borrowing headroom (using ${Math.round((requestedCents / limit) * 100)}% of limit)`);

  // 5) Security — own deposits + guarantors must cover the loan (max 10)
  const isInstant =
    product.instantCapCents !== null && requestedCents <= product.instantCapCents;
  const coverage = input.depositsCents + input.guarantorCoverageCents;
  if (!isInstant && coverage < requestedCents) {
    reasons.push(
      `Blocked: deposits + guarantors cover ${coverage} of ${requestedCents} cents — add guarantors.`,
    );
    return declined(product, input, requestedCents, reasons);
  }
  const secPts = isInstant ? 5 : 10;
  score += secPts;
  reasons.push(isInstant ? `+${secPts} instant product (no guarantor needed under cap)` : `+${secPts} fully secured by deposits + guarantors`);

  const tier: RiskTier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'DECLINE';
  if (tier === 'DECLINE') {
    reasons.push('Score below the 45-point approval floor.');
    return declined(product, input, requestedCents, reasons, score);
  }

  return {
    score,
    tier,
    monthlyRatePct: round2(product.baseMonthlyRatePct + TIER_PREMIUM_PCT[tier]),
    maxLoanCents: limit,
    reasons,
    qualified: true,
  };
}

function declined(
  product: LoanProduct,
  input: EligibilityInput,
  requestedCents: number,
  reasons: string[],
  score = 0,
): EligibilityResult {
  return {
    score,
    tier: 'DECLINE',
    monthlyRatePct: product.baseMonthlyRatePct,
    maxLoanCents: maxLoanCents(product, input.depositsCents, input.existingLoanBalanceCents),
    reasons,
    qualified: false,
  };
}

export interface AmortizationRow {
  month: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  balanceCents: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  totalInterestCents: number;
  totalPaidCents: number;
  monthlyPaymentCents: number;
}

/**
 * Reducing-balance (annuity) schedule. Interest accrues only on the
 * outstanding balance — the cheap, honest method the best SACCOs use.
 * The final instalment absorbs rounding so the balance lands on exactly 0.
 */
export function amortizeReducingBalance(
  principalCents: number,
  monthlyRatePct: number,
  months: number,
): AmortizationSchedule {
  if (principalCents <= 0 || months <= 0) {
    return { rows: [], totalInterestCents: 0, totalPaidCents: 0, monthlyPaymentCents: 0 };
  }
  const r = monthlyRatePct / 100;
  const payment =
    r === 0
      ? Math.ceil(principalCents / months)
      : Math.ceil((principalCents * r) / (1 - Math.pow(1 + r, -months)));

  const rows: AmortizationRow[] = [];
  let balance = principalCents;
  let totalInterest = 0;

  for (let m = 1; m <= months && balance > 0; m++) {
    const interest = Math.round(balance * r);
    let principal = payment - interest;
    let pay = payment;
    if (m === months || principal >= balance) {
      principal = balance;
      pay = principal + interest;
    }
    balance -= principal;
    totalInterest += interest;
    rows.push({
      month: m,
      paymentCents: pay,
      interestCents: interest,
      principalCents: principal,
      balanceCents: balance,
    });
  }

  return {
    rows,
    totalInterestCents: totalInterest,
    totalPaidCents: principalCents + totalInterest,
    monthlyPaymentCents: payment,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
