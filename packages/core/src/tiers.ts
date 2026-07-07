/**
 * Credit-graduation tiers — Pillar 4 (party level).
 *
 * While graduation.ts tracks the INSTITUTION up the chama→listed ladder,
 * this module tracks each PARTY on the credit trail — member, group or
 * business — through earned tiers based on holistic performance: saving
 * discipline, repayment behaviour, tenure, deposits, and whether they run
 * real books (Pillar 3). Every tier is machine-checkable and every unlock
 * is concrete: higher multipliers, cheaper money, bigger instant caps.
 */

export type CreditTierId = 'SEED' | 'SPROUT' | 'HARVEST' | 'MKUBWA';

export const CREDIT_TIER_ORDER: CreditTierId[] = ['SEED', 'SPROUT', 'HARVEST', 'MKUBWA'];

export interface CreditTierBenefits {
  /** Max loan as multiple of deposits (overrides product default when higher). */
  depositMultiplier: number;
  /** Discount off the product's monthly base rate (percentage points). */
  rateDiscountPct: number;
  /** Instant, guarantor-free cap in cents (emergency-style disbursal). */
  instantCapCents: number;
  /** Max repayment term in months. */
  maxTermMonths: number;
  perks: string[];
}

export interface CreditTier {
  id: CreditTierId;
  name: string;
  tagline: string;
  benefits: CreditTierBenefits;
}

export const CREDIT_TIERS: Record<CreditTierId, CreditTier> = {
  SEED: {
    id: 'SEED',
    name: 'Seed',
    tagline: 'Every party starts here — save, and the system starts scoring.',
    benefits: {
      depositMultiplier: 1,
      rateDiscountPct: 0,
      instantCapCents: 1_000_000, // 10,000 units
      maxTermMonths: 6,
      perks: ['Savings earn 10% p.a. from day one', 'Instant micro-loans up to the cap'],
    },
  },
  SPROUT: {
    id: 'SPROUT',
    name: 'Sprout',
    tagline: 'Consistent saver — real limits unlock.',
    benefits: {
      depositMultiplier: 2,
      rateDiscountPct: 0,
      instantCapCents: 3_000_000,
      maxTermMonths: 12,
      perks: ['2× deposit borrowing', 'Development & Business Boost products unlock'],
    },
  },
  HARVEST: {
    id: 'HARVEST',
    name: 'Harvest',
    tagline: 'Proven repayer — cheaper money, longer terms.',
    benefits: {
      depositMultiplier: 3,
      rateDiscountPct: 0.1,
      instantCapCents: 5_000_000,
      maxTermMonths: 24,
      perks: ['Full 3× multiplier', '−0.1%/mo loyalty discount', 'Guarantor requirement halved'],
    },
  },
  MKUBWA: {
    id: 'MKUBWA',
    name: 'Mkubwa',
    tagline: 'The trail-blazer — best rates, biggest room, board-level trust.',
    benefits: {
      depositMultiplier: 4,
      rateDiscountPct: 0.25,
      instantCapCents: 10_000_000,
      maxTermMonths: 36,
      perks: ['4× deposit borrowing', '−0.25%/mo discount', 'Self-guaranteed up to deposits', 'Eligible to guarantee others at full weight'],
    },
  },
};

/** Holistic performance inputs — all derivable from Pillars 1–4 activity. */
export interface CreditTierInput {
  monthsActive: number;
  savingStreakMonths: number;
  /** 0–1 share of instalments paid on time (1 if no loan history). */
  onTimeRepaymentRate: number;
  loansCleared: number;
  depositsCents: number;
  /** Months of Pillar-3 books kept (P&L entries) — rewards transparency. */
  booksMonths: number;
  hasDefaultHistory: boolean;
}

export interface TierCheck {
  label: string;
  met: boolean;
  detail: string;
}

export interface CreditTierAssessment {
  tier: CreditTier;
  nextTier: CreditTier | null;
  /** Requirements for the NEXT tier. */
  checks: TierCheck[];
  readinessPct: number;
}

function chk(label: string, met: boolean, detail: string): TierCheck {
  return { label, met, detail };
}

/** Requirements to ENTER a tier (SEED has none). */
export function tierChecks(tier: CreditTierId, i: CreditTierInput): TierCheck[] {
  switch (tier) {
    case 'SEED':
      return [];
    case 'SPROUT':
      return [
        chk('3+ months active', i.monthsActive >= 3, `${i.monthsActive} months`),
        chk('3-month saving streak', i.savingStreakMonths >= 3, `${i.savingStreakMonths} consecutive months`),
        chk('No unresolved default', !i.hasDefaultHistory, i.hasDefaultHistory ? 'Clear the default to progress' : 'Clean record'),
      ];
    case 'HARVEST':
      return [
        chk('9+ months active', i.monthsActive >= 9, `${i.monthsActive} months`),
        chk('6-month saving streak', i.savingStreakMonths >= 6, `${i.savingStreakMonths} consecutive months`),
        chk('1+ loan fully cleared', i.loansCleared >= 1, `${i.loansCleared} cleared`),
        chk('≥90% on-time repayment', i.onTimeRepaymentRate >= 0.9, `${Math.round(i.onTimeRepaymentRate * 100)}% on time`),
        chk('No unresolved default', !i.hasDefaultHistory, i.hasDefaultHistory ? 'Clear the default' : 'Clean record'),
      ];
    case 'MKUBWA':
      return [
        chk('18+ months active', i.monthsActive >= 18, `${i.monthsActive} months`),
        chk('12-month saving streak', i.savingStreakMonths >= 12, `${i.savingStreakMonths} consecutive months`),
        chk('3+ loans fully cleared', i.loansCleared >= 3, `${i.loansCleared} cleared`),
        chk('≥98% on-time repayment', i.onTimeRepaymentRate >= 0.98, `${Math.round(i.onTimeRepaymentRate * 100)}% on time`),
        chk('6+ months of books kept (Pillar 3)', i.booksMonths >= 6, `${i.booksMonths} months of P&L records`),
        chk('No default in history', !i.hasDefaultHistory, i.hasDefaultHistory ? 'Defaults bar the top tier' : 'Clean record'),
      ];
  }
}

/**
 * Assess a party's credit tier: highest tier whose entry checks all pass.
 * Also returns the gap report toward the next tier — the member-visible
 * "what do I do to graduate" list.
 */
export function assessCreditTier(input: CreditTierInput): CreditTierAssessment {
  let current: CreditTierId = 'SEED';
  for (const t of CREDIT_TIER_ORDER.slice(1)) {
    if (tierChecks(t, input).every((c) => c.met)) current = t;
    else break;
  }
  const idx = CREDIT_TIER_ORDER.indexOf(current);
  const nextId = idx + 1 < CREDIT_TIER_ORDER.length ? CREDIT_TIER_ORDER[idx + 1] : null;
  const checks = nextId ? tierChecks(nextId, input) : [];
  const met = checks.filter((c) => c.met).length;
  return {
    tier: CREDIT_TIERS[current],
    nextTier: nextId ? CREDIT_TIERS[nextId] : null,
    checks,
    readinessPct: checks.length === 0 ? 100 : Math.round((met / checks.length) * 100),
  };
}

/** Effective monthly rate for a product at a given tier (never below 0.5%). */
export function tierAdjustedRatePct(baseMonthlyRatePct: number, tier: CreditTierId): number {
  return Math.max(0.5, Math.round((baseMonthlyRatePct - CREDIT_TIERS[tier].benefits.rateDiscountPct) * 100) / 100);
}

/** Effective borrowing limit at a tier (tier multiplier can exceed product default). */
export function tierAdjustedLimitCents(depositsCents: number, tier: CreditTierId): number {
  return Math.floor(depositsCents * CREDIT_TIERS[tier].benefits.depositMultiplier);
}
