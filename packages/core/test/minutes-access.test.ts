import { describe, expect, it } from 'vitest';
import { activeStandIn, canWriteMinutes, standInProblem } from '../src/minutes-access';

const now = new Date('2026-11-27T10:00:00Z');
const later = '2026-11-30T10:00:00Z';
const earlier = '2026-11-20T10:00:00Z';

describe('minutes: secretary only (owner 27/11/26)', () => {
  it('lets the secretary write, and nobody else by role alone', () => {
    const base = { myMembershipIds: ['me'], groupHasSecretary: true, standIns: [], now };
    expect(canWriteMinutes({ ...base, role: 'SECRETARY' })).toBe(true);
    expect(canWriteMinutes({ ...base, role: 'CHAIRMAN' })).toBe(false);
    expect(canWriteMinutes({ ...base, role: 'TREASURER' })).toBe(false);
    expect(canWriteMinutes({ ...base, role: 'MEMBER' })).toBe(false);
    expect(canWriteMinutes({ ...base, role: null })).toBe(false);
  });

  it('lets a named stand-in write until the date, then stops', () => {
    const base = { role: 'MEMBER' as const, myMembershipIds: ['me'], groupHasSecretary: true, now };
    expect(canWriteMinutes({ ...base, standIns: [{ membershipId: 'me', until: later }] })).toBe(true);
    expect(canWriteMinutes({ ...base, standIns: [{ membershipId: 'me', until: earlier }] })).toBe(false);
    expect(canWriteMinutes({ ...base, standIns: [{ membershipId: 'me', until: later, endedAt: earlier }] })).toBe(false);
    expect(canWriteMinutes({ ...base, standIns: [{ membershipId: 'someone-else', until: later }] })).toBe(false);
  });

  it('lets the chair write only when the group has no secretary at all', () => {
    const base = { role: 'CHAIRMAN' as const, myMembershipIds: ['me'], standIns: [], now };
    expect(canWriteMinutes({ ...base, groupHasSecretary: false })).toBe(true);
    expect(canWriteMinutes({ ...base, groupHasSecretary: true })).toBe(false);
  });

  it('picks the stand-in in force', () => {
    expect(activeStandIn([{ membershipId: 'a', until: earlier }, { membershipId: 'b', until: later }], now)?.membershipId).toBe('b');
    expect(activeStandIn([{ membershipId: 'a', until: earlier }], now)).toBeNull();
  });

  it('only the chair or secretary names a stand-in, for a member, for 1 to 30 days', () => {
    const base = { membershipId: 'm1', memberIds: ['m1', 'm2'], days: 7 };
    expect(standInProblem({ ...base, appointerRole: 'CHAIRMAN' })).toBeNull();
    expect(standInProblem({ ...base, appointerRole: 'SECRETARY' })).toBeNull();
    expect(standInProblem({ ...base, appointerRole: 'TREASURER' })).toMatch(/chair or the secretary/);
    expect(standInProblem({ ...base, appointerRole: 'CHAIRMAN', membershipId: 'x' })).toMatch(/member of this group/);
    expect(standInProblem({ ...base, appointerRole: 'CHAIRMAN', days: 0 })).toMatch(/between 1 and 30/);
    expect(standInProblem({ ...base, appointerRole: 'CHAIRMAN', days: 31 })).toMatch(/between 1 and 30/);
  });
});
