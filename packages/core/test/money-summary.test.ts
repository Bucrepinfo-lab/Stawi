import { describe, expect, it } from 'vitest';
import { emptyMeeting, type Meeting } from '../src/minutes';
import {
  businessMoneyLines, carriedForwardGaps, groupMoneyLines, harmoniseMoney, moneyTotals, stepLabel, stepStart,
  summariseMoney, trimStatement,
} from '../src/money-summary';

function meeting(no: number, date: string, o: { inEach?: number; members?: number; payout?: number; fine?: number; opening?: number; status?: 'DRAFT' | 'POSTED' } = {}): Meeting {
  const m = emptyMeeting('g1', no, []);
  m.id = `m${no}`; m.date = date; m.status = o.status ?? 'POSTED';
  m.tableBanking.contributions = Array.from({ length: o.members ?? 4 }, (_, i) => ({ memberId: `p${i}`, name: `P${i}`, amountCents: o.inEach ?? 5_000 }));
  if (o.payout) { m.tableBanking.payoutCents = o.payout; m.tableBanking.payoutRecipient = 'P0'; }
  if (o.fine) m.tableBanking.fines = [{ memberId: 'p1', name: 'P1', reason: 'late', amountCents: o.fine }];
  if (o.opening !== undefined) m.tableBanking.openingBalanceCents = o.opening;
  return m;
}

describe('periods', () => {
  it('weeks start on Monday and months on the 1st', () => {
    expect(stepStart('2026-11-20', 'day')).toBe('2026-11-20');
    expect(stepStart('2026-11-20', 'week')).toBe('2026-11-16'); // Friday → Monday
    expect(stepStart('2026-11-16', 'week')).toBe('2026-11-16');
    expect(stepStart('2026-11-22', 'week')).toBe('2026-11-16'); // Sunday
    expect(stepStart('2026-11-01', 'week')).toBe('2026-10-26'); // crosses the month
    expect(stepStart('2026-11-20', 'month')).toBe('2026-11-01');
  });

  it('labels use dd/mm/yy and plain month names', () => {
    expect(stepLabel('2026-11-20', 'day')).toBe('20/11/26');
    expect(stepLabel('2026-11-16', 'week')).toBe('Week of 16/11/26');
    expect(stepLabel('2026-11-16', 'week', 'sw')).toBe('Wiki ya 16/11/26');
    expect(stepLabel('2026-03-01', 'month')).toBe('March 2026');
    expect(stepLabel('2026-03-01', 'month', 'sw')).toBe('Machi 2026');
  });
});

describe('the same money by day, week and month', () => {
  const meetings = [
    meeting(1, '2026-10-30', { payout: 10_000 }),          // in 20,000 out 10,000
    meeting(2, '2026-11-06', { fine: 1_000 }),             // in 21,000
    meeting(3, '2026-11-13', { payout: 15_000 }),          // in 20,000 out 15,000
    meeting(4, '2026-11-14', { status: 'DRAFT' }),         // not the record yet
  ];
  const entries = [
    { type: 'SALE', amountCents: 30_000, occurredAt: '2026-11-13T09:00:00Z' },
    { type: 'SALE', amountCents: 12_000, occurredAt: '2026-11-13T15:00:00Z' },
    { type: 'PURCHASE', amountCents: 18_000, occurredAt: '2026-11-12' },
    { type: 'EXPENSE', amountCents: -2_000, occurredAt: new Date('2026-11-09T08:00:00Z') },
    { type: 'SALE', amountCents: 5_000, occurredAt: 'not a date' },
    { type: 'OTHER', amountCents: 9_000, occurredAt: '2026-11-10' },
  ];

  it('drafts and broken dates are left out', () => {
    expect(groupMoneyLines(meetings).some((l) => l.date === '2026-11-14')).toBe(false);
    expect(businessMoneyLines(entries)).toHaveLength(4);
  });

  it('group money adds up per month', () => {
    const months = summariseMoney(groupMoneyLines(meetings), 'month');
    expect(months.map((b) => [b.start, b.inCents, b.outCents, b.leftCents])).toEqual([
      ['2026-11-01', 41_000, 15_000, 26_000],
      ['2026-10-01', 20_000, 10_000, 10_000],
    ]);
    expect(months[0]!.byKind).toEqual({ contributions: 40_000, fines: 1_000, payouts: 15_000 });
  });

  it('every step reaches the same grand total, and the sides add up to together', () => {
    const h = harmoniseMoney({ meetings, entries });
    const totals = [h.day, h.week, h.month].map((s) => moneyTotals(s.together));
    expect(totals[0]).toEqual({ inCents: 103_000, outCents: 45_000, leftCents: 58_000 });
    expect(totals[1]).toEqual(totals[0]);
    expect(totals[2]).toEqual(totals[0]);
    for (const s of [h.day, h.week, h.month]) {
      expect(s.totals.group.inCents + s.totals.business.inCents).toBe(s.totals.together.inCents);
      expect(s.totals.group.outCents + s.totals.business.outCents).toBe(s.totals.together.outCents);
    }
    expect(h.checks.find((c) => c.id === 'totals_agree')!.ok).toBe(true);
    expect(h.hasGroup).toBe(true);
    expect(h.hasBusiness).toBe(true);
    expect(h.day.from).toBe('2026-10-30');
    expect(h.day.to).toBe('2026-11-13');
  });

  it('group and business share one calendar', () => {
    const h = harmoniseMoney({ meetings, entries });
    const week = h.week.together.find((b) => b.start === '2026-11-09')!;
    // group 13/11: in 20,000 out 15,000 · business: sales 42,000, stock 18,000, costs 2,000
    expect([week.inCents, week.outCents, week.leftCents]).toEqual([62_000, 35_000, 27_000]);
    const day = h.day.business.find((b) => b.start === '2026-11-13')!;
    expect(day.inCents).toBe(42_000);
    expect(trimStatement(h.day, 2).together).toHaveLength(2);
    expect(trimStatement(h.day, 2).together[0]!.start).toBe('2026-11-13');
  });
});

describe('the record is checked', () => {
  it('passes when each meeting opens with what the last closed with', () => {
    const ok = [meeting(1, '2026-11-06', { opening: 0, payout: 5_000 }), meeting(2, '2026-11-13', { opening: 15_000 })];
    expect(carriedForwardGaps(ok)).toEqual([]);
    expect(harmoniseMoney({ meetings: ok }).checks.every((c) => c.ok)).toBe(true);
  });

  it('names the meeting where the money does not carry forward', () => {
    const bad = [meeting(1, '2026-11-06', { opening: 0 }), meeting(2, '2026-11-13', { opening: 12_000 }), meeting(3, '2026-11-20', {})];
    expect(carriedForwardGaps(bad)).toEqual([{ meetingNo: 2, date: '2026-11-13', expectedCents: 20_000, writtenCents: 12_000 }]);
    const check = harmoniseMoney({ meetings: bad }).checks.find((c) => c.id === 'carried_forward')!;
    expect(check.ok).toBe(false);
    expect(check.text.en).toContain('Meeting 2 (13/11/26) opened with 120 but the meeting before closed with 200');
    expect(check.text.sw.length).toBeGreaterThan(20);
  });

  it('an empty group gives an empty, valid statement', () => {
    const h = harmoniseMoney({ meetings: [] });
    expect(h.month.together).toEqual([]);
    expect(h.hasGroup).toBe(false);
    expect(h.checks.every((c) => c.ok)).toBe(true);
  });
});
