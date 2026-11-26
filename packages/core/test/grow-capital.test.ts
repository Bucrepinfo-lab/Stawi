import { describe, expect, it } from 'vitest';
import { MIN_NOT_MAX, monthsLabel, monthsToTarget, monthsWithExtra, paceLine } from '../src/grow-capital';

/** Owner 26/11/26: the agreed amount is a minimum, not a maximum. */
describe('reaching the capital sooner', () => {
  const g = { totalCents: 7_000_000, targetCents: 30_000_000, members: 10, minimumCents: 10_000, meetingsPerMonth: 4 };
  it('minimum only is slow', () => {
    // KES 230,000 left, 10 × KES 100 × 4 = KES 4,000 a month → 58 months
    expect(monthsToTarget(g)).toBe(58);
    expect(monthsLabel(58)).toBe('4 years and 10 months');
  });
  it('a few members adding more cuts the wait sharply', () => {
    // + 4 members × KES 500 × 4 = KES 8,000 more → KES 12,000 a month → 20 months
    expect(monthsWithExtra(g, 4, 50_000)).toBe(20);
    expect(paceLine(g, 4, 50_000)).toBe('With the minimum only: 4 years and 10 months. If 4 members add KES 500 more each meeting: 1 year and 8 months.');
  });
  it('edge cases', () => {
    expect(monthsToTarget({ ...g, totalCents: 40_000_000 })).toBe(0);
    expect(monthsToTarget({ ...g, minimumCents: 0 })).toBeNull();
    expect(monthsLabel(null)).toBe('never');
    expect(monthsLabel(14, 'sw')).toBe('miaka 1 na miezi 2');
    expect(monthsWithExtra(g, 99, 50_000)).toBe(monthsWithExtra(g, 10, 50_000));
  });
  it('the message is in both languages and never pushes anyone', () => {
    expect(MIN_NOT_MAX.en.points).toHaveLength(4);
    expect(MIN_NOT_MAX.sw.points).toHaveLength(4);
    expect(MIN_NOT_MAX.en.points.join(' ')).toMatch(/Nobody is pushed/);
  });
});
