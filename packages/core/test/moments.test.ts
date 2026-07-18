import { describe, it, expect } from 'vitest';
import { MOMENTS, detectMoments, fillMoment, type MomentSignals } from '../src/moments';

const quiet: MomentSignals = {
  savingStreakMonths: 1,
  sharePct: 10,
  sharePctPrev: 10,
  nextPayoutDays: null,
  memberCount: 20,
  memberTarget: 50,
  newVenturesUnlocked: 0,
  shortlistPendingVotes: 0,
  booksStreakMonths: 0,
  taxDueDays: null,
  deadStockCount: 0,
  interestEarnedMonthCents: 0,
  tierReadinessPct: 0,
  nextTierName: null,
  nextTierRatePct: null,
  institutionReadinessDeltaPct: 0,
  trialDaysLeft: null,
};

describe('moments catalog', () => {
  it('covers all four pillars and all four goals', () => {
    expect(new Set(MOMENTS.map((m) => m.pillar))).toEqual(new Set([1, 2, 3, 4]));
    expect(new Set(MOMENTS.map((m) => m.goal))).toEqual(
      new Set(['RETAIN', 'MOBILIZE', 'REFER', 'MONETIZE']),
    );
  });

  it('every moment ships full channel copy', () => {
    for (const m of MOMENTS) {
      for (const k of ['hook', 'message', 'ctaLabel', 'ctaHref', 'smsText', 'emailSubject', 'posterHeadline', 'newsletterBlurb'] as const) {
        expect(m.copy[k].length, `${m.id}.${k}`).toBeGreaterThan(5);
      }
      expect(m.copy.ctaHref.startsWith('/')).toBe(true);
    }
  });

  it('SMS templates stay within 160 chars after a generous fill', () => {
    for (const m of MOMENTS) {
      const filled = fillMoment(m.copy.smsText, {
        name: 'Wanjiru Kamau', group: 'Umoja Women Group', value: 'KES 1,234,567 (99%)', tier: 'Harvest',
      });
      expect(filled.length, m.id).toBeLessThanOrEqual(160);
    }
  });
});

describe('detectMoments', () => {
  it('returns nothing when nothing is happening', () => {
    expect(detectMoments(quiet)).toEqual([]);
  });

  it('prioritises the trial-ending monetize moment above all', () => {
    const active = detectMoments({
      ...quiet,
      trialDaysLeft: 3,
      savingStreakMonths: 6,
      interestEarnedMonthCents: 50_000,
    });
    expect(active[0].id).toBe('lifecycle-trial-ending');
  });

  it('caps results to the limit, highest priority first', () => {
    const busy: MomentSignals = {
      ...quiet,
      savingStreakMonths: 6,
      sharePct: 14,
      nextPayoutDays: 7,
      memberCount: 45,
      newVenturesUnlocked: 2,
      shortlistPendingVotes: 3,
      booksStreakMonths: 5,
      taxDueDays: 4,
      interestEarnedMonthCents: 100_000,
      tierReadinessPct: 80,
      nextTierName: 'Harvest',
      nextTierRatePct: 0.9,
      institutionReadinessDeltaPct: 8,
      trialDaysLeft: 5,
    };
    const active = detectMoments(busy, 3);
    expect(active).toHaveLength(3);
    expect(active[0].priority).toBeGreaterThanOrEqual(active[1].priority);
    expect(active[1].priority).toBeGreaterThanOrEqual(active[2].priority);
  });

  it('fires the tier-close mobilization only in the 60–99% window', () => {
    const at = (pct: number) =>
      detectMoments({ ...quiet, tierReadinessPct: pct, nextTierName: 'Harvest', nextTierRatePct: 0.9 })
        .some((m) => m.id === 'p4-tier-close');
    expect(at(50)).toBe(false);
    expect(at(75)).toBe(true);
    expect(at(100)).toBe(false);
  });
});

describe('fillMoment', () => {
  it('replaces every placeholder', () => {
    const out = fillMoment('{name} of {group}: {value} to {tier}', {
      name: 'Amina', group: 'Umoja', value: '80%', tier: 'Harvest',
    });
    expect(out).toBe('Amina of Umoja: 80% to Harvest');
    expect(out).not.toMatch(/[{}]/);
  });
});
