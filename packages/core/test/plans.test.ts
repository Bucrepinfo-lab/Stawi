import { describe, it, expect } from 'vitest';
import { getPlan, withinMemberLimit, withinGroupLimit, PLAN_ORDER } from '../src/plans';

describe('plans', () => {
  it('has four tiers in order', () => {
    expect(PLAN_ORDER).toEqual(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE']);
  });
  it('prices every plan per group except Enterprise (invoiced)', () => {
    expect(getPlan('FREE').billing).toBe('PER_GROUP');
    expect(getPlan('STARTER').billing).toBe('PER_GROUP');
    expect(getPlan('GROWTH').billing).toBe('PER_GROUP');
    expect(getPlan('ENTERPRISE').billing).toBe('CUSTOM');
  });
  it('every plan starts with a free month', () => {
    for (const t of PLAN_ORDER) expect(getPlan(t).trialDays).toBe(30);
  });
  it('the small-group plan is the FREE tier, up to 10 members', () => {
    expect(getPlan('FREE').name).toBe('Small group');
    expect(getPlan('FREE').memberLimit).toBe(10);
  });
  it('enforces limits', () => {
    expect(withinMemberLimit('FREE', 10)).toBe(true);
    expect(withinMemberLimit('FREE', 11)).toBe(false);
    expect(withinGroupLimit('ENTERPRISE', 9999)).toBe(true);
    expect(getPlan('GROWTH').memberLimit).toBe(250);
  });
});
