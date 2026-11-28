import { describe, expect, it } from 'vitest';
import { buildRoster, roundProblem, roundRecordProblem, roundTotals, turnState } from '../src/table-round';

const plan = { amountCents: 100_000, profitCents: 10_000, everyDays: 7, startsOn: '2026-11-29', memberIds: ['a', 'b', 'c'] };

/** Owner 28/11/26: 1,000 this Sunday, back next Sunday with 100, member after member. */
describe('table banking round', () => {
  it('gives every member one turn, a week apart, returning with the agreed profit', () => {
    const roster = buildRoster(plan);
    expect(roster.map((t) => [t.turn, t.membershipId, t.givenOn, t.returnOn, t.givenCents, t.returnCents])).toEqual([
      [1, 'a', '2026-11-29', '2026-12-06', 100_000, 110_000],
      [2, 'b', '2026-12-06', '2026-12-13', 100_000, 110_000],
      [3, 'c', '2026-12-13', '2026-12-20', 100_000, 110_000],
    ]);
  });

  it('refuses plans that make no sense, in plain words', () => {
    expect(roundProblem({ ...plan, amountCents: 0 })).toMatch(/amount/);
    expect(roundProblem({ ...plan, profitCents: 200_000 })).toMatch(/more than/);
    expect(roundProblem({ ...plan, memberIds: ['a'] })).toMatch(/two members/);
    expect(roundProblem({ ...plan, memberIds: ['a', 'a'] })).toMatch(/one turn/);
    expect(roundProblem({ ...plan, everyDays: 0 })).toMatch(/how often/);
    expect(roundProblem({ ...plan, startsOn: 'soon' })).toMatch(/first turn/);
    expect(roundProblem({ ...plan, profitCents: 0 })).toBeNull();
  });

  it('knows where each turn stands', () => {
    const [first] = buildRoster(plan);
    expect(turnState(first!, {}, '2026-11-28')).toBe('coming');
    expect(turnState(first!, {}, '2026-11-29')).toBe('due_out');
    expect(turnState(first!, { givenAt: '2026-11-29' }, '2026-12-06')).toBe('out');
    expect(turnState(first!, { givenAt: '2026-11-29' }, '2026-12-07')).toBe('late');
    expect(turnState(first!, { givenAt: '2026-11-29', returnedAt: '2026-12-06' }, '2026-12-09')).toBe('back');
  });

  it('adds up what is out and the profit, in whole cents', () => {
    const [a, b, c] = buildRoster(plan);
    const totals = roundTotals(
      [
        { ...a!, givenAt: '2026-11-29', returnedAt: '2026-12-06', returnedCents: 110_000 },
        { ...b!, givenAt: '2026-12-06' },
        { ...c! },
      ],
      '2026-12-14',
    );
    expect(totals).toEqual({ turns: 3, turnsBack: 1, outCents: 100_000, profitBackCents: 10_000, profitWhenDoneCents: 30_000, late: 1 });
  });

  it('only the treasurer or chair writes, and never their own turn', () => {
    expect(roundRecordProblem({ role: 'TREASURER', recorderIds: ['t'], turnMembershipId: 'a' })).toBeNull();
    expect(roundRecordProblem({ role: 'CHAIRMAN', recorderIds: ['ch'], turnMembershipId: 'a' })).toBeNull();
    expect(roundRecordProblem({ role: 'TREASURER', recorderIds: ['t'], turnMembershipId: 't' })).toMatch(/own turn/);
    expect(roundRecordProblem({ role: 'MEMBER', recorderIds: ['m'], turnMembershipId: 'a' })).toMatch(/treasurer/);
    expect(roundRecordProblem({ role: null, recorderIds: [], turnMembershipId: 'a' })).toMatch(/treasurer/);
  });
});
