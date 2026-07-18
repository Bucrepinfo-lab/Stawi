import { describe, it, expect } from 'vitest';
import { getPlan, amountDueUsdCents, withinMemberLimit, withinGroupLimit, PLAN_ORDER } from '../src/plans';

describe('plans', () => {
  it('has four tiers in order', () => {
    expect(PLAN_ORDER).toEqual(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE']);
  });
  it('first month free, then charges', () => {
    expect(amountDueUsdCents('STARTER', 1)).toBe(0);
    expect(amountDueUsdCents('STARTER', 2)).toBe(1000);
  });
  it('free plan is always 0', () => {
    expect(amountDueUsdCents('FREE', 5)).toBe(0);
  });
  it('enterprise is custom-billed (0 via app)', () => {
    expect(amountDueUsdCents('ENTERPRISE', 3)).toBe(0);
  });
  it('enforces limits', () => {
    expect(withinMemberLimit('FREE', 10)).toBe(true);
    expect(withinMemberLimit('FREE', 11)).toBe(false);
    expect(withinGroupLimit('ENTERPRISE', 9999)).toBe(true);
    expect(getPlan('GROWTH').memberLimit).toBe(250);
  });
});
