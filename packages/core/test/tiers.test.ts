import { describe, it, expect } from 'vitest';
import {
  CREDIT_TIER_ORDER,
  CREDIT_TIERS,
  assessCreditTier,
  tierAdjustedRatePct,
  tierAdjustedLimitCents,
  type CreditTierInput,
} from '../src/tiers';

const newbie: CreditTierInput = {
  monthsActive: 1,
  savingStreakMonths: 1,
  onTimeRepaymentRate: 1,
  loansCleared: 0,
  depositsCents: 500_000,
  booksMonths: 0,
  hasDefaultHistory: false,
};

const veteran: CreditTierInput = {
  monthsActive: 24,
  savingStreakMonths: 14,
  onTimeRepaymentRate: 1,
  loansCleared: 4,
  depositsCents: 10_000_000,
  booksMonths: 12,
  hasDefaultHistory: false,
};

describe('credit tiers', () => {
  it('orders four tiers seed → mkubwa with growing benefits', () => {
    expect(CREDIT_TIER_ORDER).toEqual(['SEED', 'SPROUT', 'HARVEST', 'MKUBWA']);
    const mult = CREDIT_TIER_ORDER.map((t) => CREDIT_TIERS[t].benefits.depositMultiplier);
    expect([...mult].sort((a, b) => a - b)).toEqual(mult); // monotonic
  });

  it('a new party starts at SEED aiming for SPROUT', () => {
    const a = assessCreditTier(newbie);
    expect(a.tier.id).toBe('SEED');
    expect(a.nextTier!.id).toBe('SPROUT');
    expect(a.checks.length).toBeGreaterThan(0);
  });

  it('holistic performance graduates a veteran to MKUBWA', () => {
    const a = assessCreditTier(veteran);
    expect(a.tier.id).toBe('MKUBWA');
    expect(a.nextTier).toBeNull();
    expect(a.readinessPct).toBe(100);
  });

  it('a default blocks progression past SEED', () => {
    const a = assessCreditTier({ ...veteran, hasDefaultHistory: true });
    expect(a.tier.id).toBe('SEED');
  });

  it('books-keeping (Pillar 3) is required for the top tier', () => {
    const a = assessCreditTier({ ...veteran, booksMonths: 0 });
    expect(a.tier.id).toBe('HARVEST');
    expect(a.checks.find((c) => c.label.includes('books'))!.met).toBe(false);
  });

  it('readiness reflects partial progress to the next tier', () => {
    const a = assessCreditTier({ ...newbie, monthsActive: 4, savingStreakMonths: 2 });
    expect(a.tier.id).toBe('SEED');
    expect(a.readinessPct).toBeGreaterThan(0);
    expect(a.readinessPct).toBeLessThan(100);
  });

  it('tier discounts lower the rate but never below 0.5%/mo', () => {
    expect(tierAdjustedRatePct(1.0, 'SEED')).toBe(1.0);
    expect(tierAdjustedRatePct(1.0, 'HARVEST')).toBe(0.9);
    expect(tierAdjustedRatePct(1.0, 'MKUBWA')).toBe(0.75);
    expect(tierAdjustedRatePct(0.6, 'MKUBWA')).toBe(0.5);
  });

  it('tier multiplier raises the borrowing limit', () => {
    expect(tierAdjustedLimitCents(10_000_000, 'SEED')).toBe(10_000_000);
    expect(tierAdjustedLimitCents(10_000_000, 'MKUBWA')).toBe(40_000_000);
  });
});
