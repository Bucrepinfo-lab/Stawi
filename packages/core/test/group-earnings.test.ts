import { describe, expect, it } from 'vitest';
import { groupEarnings, groupEarningsCsv, type EarningsTurn, type EarningsFine } from '../src';

const turn = (p: Partial<EarningsTurn>): EarningsTurn => ({ roundNo: 1, turn: 1, name: 'Amina', givenCents: 1000_00, returnCents: 1100_00, returnOn: '2026-12-05', returnedCents: null, returnedOn: null, given: true, ...p });
const fine = (p: Partial<EarningsFine>): EarningsFine => ({ meetingNo: 3, date: '2026-11-20', name: 'Brian', reason: 'late', amountCents: 50_00, posted: true, ...p });

describe('group earnings', () => {
  it('counts the KES 100 extra once it is brought back, and fines from posted minutes', () => {
    const e = groupEarnings([turn({ returnedCents: 1100_00, returnedOn: '2026-12-05' })], [fine({}), fine({ reason: 'absent', amountCents: 100_00 })], '2026-12-06');
    expect(e.roundInCents).toBe(100_00);
    expect(e.finesInCents).toBe(150_00);
    expect(e.inCents).toBe(250_00);
    expect(e.lines[0]!.why).toMatch(/Round 1, turn 1: extra brought back/);
    expect(e.byMonth).toEqual([{ month: '2026-12', roundCents: 100_00, finesCents: 0 }, { month: '2026-11', roundCents: 0, finesCents: 150_00 }]);
  });

  it('shows agreed extra as still to come, and late after the day passes', () => {
    expect(groupEarnings([turn({})], [], '2026-12-01').lines[0]!.state).toBe('coming');
    const late = groupEarnings([turn({})], [], '2026-12-09');
    expect(late.lines[0]!.state).toBe('late');
    expect(late.comingCents).toBe(100_00);
    expect(late.lateCents).toBe(100_00);
    expect(late.inCents).toBe(0);
  });

  it('nothing is expected before the money is handed out', () => {
    expect(groupEarnings([turn({ given: false })], [], '2026-12-09').lines).toEqual([]);
  });

  it('a member who brings back less shows as a shortfall that lowers the earnings', () => {
    const e = groupEarnings([turn({ returnedCents: 900_00, returnedOn: '2026-12-05' }), turn({ turn: 2, name: 'Joy', returnedCents: 1100_00, returnedOn: '2026-12-12' })], [], '2026-12-20');
    expect(e.shortCents).toBe(100_00);
    expect(e.roundInCents).toBe(0);
  });

  it('fines in draft minutes are kept apart as not final', () => {
    const e = groupEarnings([], [fine({ posted: false })], '2026-12-01');
    expect(e.draftCents).toBe(50_00);
    expect(e.inCents).toBe(0);
  });

  it('writes a spreadsheet copy with a total', () => {
    const csv = groupEarningsCsv(groupEarnings([], [fine({ name: 'Brian "B"' })], '2026-12-01'));
    expect(csv).toContain('"Brian ""B"""');
    expect(csv.trim().split('\n').at(-1)).toContain('"50.00"');
  });
});
