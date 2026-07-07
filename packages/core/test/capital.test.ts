import { describe, it, expect } from 'vitest';
import {
  computeCapitalShares,
  applyContribution,
  formatMoney,
  round2,
  type MemberContribution,
} from '../src/capital';

const members: MemberContribution[] = [
  { memberId: 'a', name: 'Amina', totalCents: 4_200_000 },
  { memberId: 'b', name: 'Joseph', totalCents: 3_800_000 },
  { memberId: 'c', name: 'Grace', totalCents: 2_000_000 },
];

describe('computeCapitalShares', () => {
  it('sums total capital correctly', () => {
    expect(computeCapitalShares(members).totalCents).toBe(10_000_000);
  });

  it('computes each share as a percentage of total', () => {
    const snap = computeCapitalShares(members);
    expect(snap.members[0]!.sharePct).toBe(42);
    expect(snap.members[1]!.sharePct).toBe(38);
    expect(snap.members[2]!.sharePct).toBe(20);
  });

  it('shares sum to ~100', () => {
    expect(computeCapitalShares(members).sharePctSum).toBeCloseTo(100, 1);
  });

  it('handles an empty group without dividing by zero', () => {
    const snap = computeCapitalShares([]);
    expect(snap.totalCents).toBe(0);
    expect(snap.sharePctSum).toBe(0);
  });

  it('treats negative balances as zero', () => {
    const snap = computeCapitalShares([
      { memberId: 'x', name: 'X', totalCents: -500 },
      { memberId: 'y', name: 'Y', totalCents: 500 },
    ]);
    expect(snap.members[0]!.sharePct).toBe(0);
    expect(snap.members[1]!.sharePct).toBe(100);
  });
});

describe('applyContribution', () => {
  it('recomputes shares after a new payment (the live fan-out)', () => {
    const snap = applyContribution(members, 'c', 8_000_000);
    expect(snap.totalCents).toBe(18_000_000);
    // Grace now has 10,000,000 / 18,000,000 = 55.56%
    expect(snap.members[2]!.sharePct).toBeCloseTo(55.56, 1);
  });

  it('does not mutate the input array', () => {
    const before = members[2]!.totalCents;
    applyContribution(members, 'c', 1000);
    expect(members[2]!.totalCents).toBe(before);
  });

  it('rejects non-positive contributions', () => {
    expect(() => applyContribution(members, 'a', 0)).toThrow();
  });

  it('rejects unknown members', () => {
    expect(() => applyContribution(members, 'zzz', 1000)).toThrow(/Unknown member/);
  });
});

describe('formatMoney & round2', () => {
  it('formats cents as KES display string', () => {
    expect(formatMoney(4_200_000)).toBe('42,000');
    expect(formatMoney(4_200_050, { decimals: true })).toBe('42,000.50');
  });
  it('round2 avoids float artefacts', () => {
    expect(round2(1.005)).toBe(1.01);
  });
});
