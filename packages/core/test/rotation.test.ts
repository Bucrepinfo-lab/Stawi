import { describe, it, expect } from 'vitest';
import {
  buildRotationSchedule,
  cyclePayoutCents,
  recipientForCycle,
  type RotationMember,
} from '../src/rotation';

const members: RotationMember[] = [
  { memberId: 'a', name: 'Amina', order: 0 },
  { memberId: 'c', name: 'Grace', order: 2 },
  { memberId: 'b', name: 'Joseph', order: 1 },
];

describe('buildRotationSchedule', () => {
  it('orders payouts by rotation order', () => {
    const s = buildRotationSchedule(members, 1);
    expect(s.map((x) => x.recipientName)).toEqual(['Amina', 'Joseph', 'Grace']);
  });

  it('flags past and current cycles', () => {
    const s = buildRotationSchedule(members, 2);
    expect(s[0]!.isPast).toBe(true);
    expect(s[1]!.isCurrent).toBe(true);
    expect(s[2]!.isPast).toBe(false);
  });
});

describe('cyclePayoutCents', () => {
  it('pools every member contribution into one payout', () => {
    expect(cyclePayoutCents(6, 1_000_000)).toBe(6_000_000);
  });
});

describe('recipientForCycle', () => {
  it('returns the right recipient for a cycle', () => {
    expect(recipientForCycle(members, 2)?.name).toBe('Joseph');
  });
  it('returns null for out-of-range cycles', () => {
    expect(recipientForCycle(members, 0)).toBeNull();
    expect(recipientForCycle(members, 99)).toBeNull();
  });
});
