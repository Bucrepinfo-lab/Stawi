import { describe, expect, it } from 'vitest';
import { buildRoster, roundProblem, roundRecordProblem, roundReminderText, roundRemindersDue, roundTotals, turnState } from '../src/table-round';

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

/** Owner 28/11/26 ("yes, go ahead"): a reminder the day before the money is due back. */
describe('return reminder', () => {
  const [first, second] = buildRoster(plan); // first returns 06/12, second 13/12
  const out = { ...first!, givenAt: '2026-11-29T09:00:00Z' };

  it('is due only the day before the return day', () => {
    expect(roundRemindersDue([out], '2026-12-05')).toHaveLength(1);
    expect(roundRemindersDue([out], '2026-12-04')).toHaveLength(0);
    expect(roundRemindersDue([out], '2026-12-06')).toHaveLength(0);
  });

  it('skips money never given and money already back', () => {
    expect(roundRemindersDue([{ ...first! }], '2026-12-05')).toHaveLength(0);
    expect(roundRemindersDue([{ ...out, returnedAt: '2026-12-04T09:00:00Z' }], '2026-12-05')).toHaveLength(0);
    expect(roundRemindersDue([{ ...second!, givenAt: '2026-12-06T09:00:00Z' }], '2026-12-05')).toHaveLength(0);
  });

  it('says the day, the amount and the profit, and never the word loan', () => {
    const text = roundReminderText({ name: 'Wanjiru', returnOn: out.returnOn, givenCents: out.givenCents, returnCents: out.returnCents });
    expect(text).toContain('Wanjiru');
    expect(text).toContain('06/12/26');
    expect(text).toContain('KES 1,100');
    expect(text).toContain('KES 100 profit');
    expect(text.toLowerCase()).not.toContain('loan');
  });
});
