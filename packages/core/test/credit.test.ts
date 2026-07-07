import { describe, it, expect } from 'vitest';
import {
  LOAN_PRODUCTS,
  maxLoanCents,
  scoreEligibility,
  amortizeReducingBalance,
  type EligibilityInput,
} from '../src/credit';

const strongMember: EligibilityInput = {
  monthsActive: 24,
  depositsCents: 10_000_000, // 100,000 units saved
  savingStreakMonths: 12,
  onTimeRepaymentRate: 1,
  existingLoanBalanceCents: 0,
  guarantorCoverageCents: 25_000_000,
  hasDefaultHistory: false,
};

describe('maxLoanCents', () => {
  it('applies the 3× deposit multiplier', () => {
    expect(maxLoanCents(LOAN_PRODUCTS.DEVELOPMENT, 10_000_000)).toBe(30_000_000);
  });

  it('nets off an existing loan balance', () => {
    expect(maxLoanCents(LOAN_PRODUCTS.DEVELOPMENT, 10_000_000, 5_000_000)).toBe(25_000_000);
  });
});

describe('scoreEligibility', () => {
  it('gives a disciplined saver tier A at the base 1%/month rate', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 15_000_000, strongMember);
    expect(r.qualified).toBe(true);
    expect(r.tier).toBe('A');
    expect(r.monthlyRatePct).toBe(1.0);
  });

  it('blocks below minimum membership months', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 1_000_000, {
      ...strongMember,
      monthsActive: 1,
    });
    expect(r.qualified).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/months of membership/);
  });

  it('blocks unresolved defaulters', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 1_000_000, {
      ...strongMember,
      hasDefaultHistory: true,
    });
    expect(r.qualified).toBe(false);
  });

  it('blocks requests above the multiplier limit', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 40_000_000, strongMember);
    expect(r.qualified).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/deposit limit/);
  });

  it('requires guarantor coverage for non-instant products', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 25_000_000, {
      ...strongMember,
      guarantorCoverageCents: 0,
    });
    expect(r.qualified).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/guarantor/i);
  });

  it('waives guarantors for instant emergency loans under the cap', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.EMERGENCY, 4_000_000, {
      ...strongMember,
      guarantorCoverageCents: 0,
    });
    expect(r.qualified).toBe(true);
  });

  it('prices risk: weaker profile pays a premium', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 15_000_000, {
      ...strongMember,
      savingStreakMonths: 1,
      onTimeRepaymentRate: 0.7,
      monthsActive: 4,
    });
    expect(r.qualified).toBe(true);
    expect(r.tier).not.toBe('A');
    expect(r.monthlyRatePct).toBeGreaterThan(1.0);
  });

  it('explains every determinant in reasons', () => {
    const r = scoreEligibility(LOAN_PRODUCTS.DEVELOPMENT, 15_000_000, strongMember);
    expect(r.reasons.length).toBeGreaterThanOrEqual(5);
  });
});

describe('amortizeReducingBalance', () => {
  it('lands the balance on exactly zero', () => {
    const s = amortizeReducingBalance(12_000_000, 1, 12);
    expect(s.rows.at(-1)!.balanceCents).toBe(0);
    expect(s.rows.length).toBeLessThanOrEqual(12);
  });

  it('conserves money: payments = principal + interest', () => {
    const s = amortizeReducingBalance(12_000_000, 1, 12);
    const paid = s.rows.reduce((sum, r) => sum + r.paymentCents, 0);
    expect(paid).toBe(s.totalPaidCents);
    expect(s.totalPaidCents).toBe(12_000_000 + s.totalInterestCents);
  });

  it('1%/month over 12 months costs roughly 6–7% total interest', () => {
    const s = amortizeReducingBalance(10_000_000, 1, 12);
    const pctOfPrincipal = (s.totalInterestCents / 10_000_000) * 100;
    expect(pctOfPrincipal).toBeGreaterThan(5.5);
    expect(pctOfPrincipal).toBeLessThan(7.5);
  });

  it('handles zero-rate loans', () => {
    const s = amortizeReducingBalance(1_200_000, 0, 12);
    expect(s.totalInterestCents).toBe(0);
    expect(s.rows.at(-1)!.balanceCents).toBe(0);
  });

  it('returns empty schedule for invalid input', () => {
    expect(amortizeReducingBalance(0, 1, 12).rows).toEqual([]);
    expect(amortizeReducingBalance(1000, 1, 0).rows).toEqual([]);
  });
});
