import { describe, expect, it } from 'vitest';
import { memberHistory, memberHistoryCsv } from '../src/member-history';

/** Owner 26/11/26: every member keeps their own downloadable payment history. */
describe('member payment history', () => {
  const entries = [
    { id: 'b', at: '2026-10-03T09:00:00Z', amountCents: 200_000, channel: 'CASH', ref: null, isCorrection: false, witnessed: '2 of 2' },
    { id: 'a', at: '2026-09-05T09:00:00Z', amountCents: 300_000, channel: 'MPESA_STK', ref: 'SKL4AB12CD', isCorrection: false, witnessed: null },
    { id: 'c', at: '2026-11-07T09:00:00Z', amountCents: -100_000, channel: 'CASH', ref: null, isCorrection: true, witnessed: null },
  ];
  it('orders by date with a running total', () => {
    const h = memberHistory(entries);
    expect(h.lines.map((l) => l.date)).toEqual(['05/09/26', '03/10/26', '07/11/26']);
    expect(h.lines.map((l) => l.runningCents)).toEqual([300_000, 500_000, 400_000]);
    expect(h.lines[2]!.way).toBe('Correction');
    expect(h.totalCents).toBe(400_000);
    expect(h.count).toBe(2);
    expect([h.first, h.last]).toEqual(['05/09/26', '07/11/26']);
  });
  it('empty history', () => {
    expect(memberHistory([])).toMatchObject({ totalCents: 0, count: 0, first: null });
  });
  it('CSV has the heading, each line and the total; formulas neutralised', () => {
    const h = memberHistory(entries);
    const csv = memberHistoryCsv({ groupName: '=HYPERLINK("x")', memberName: 'Mary, W', lines: h.lines, totalCents: h.totalCents });
    expect(csv).toContain('Date,Amount (KES),Way,Reference,Witnessed,Running total (KES)');
    expect(csv).toContain('05/09/26,"3,000",M-Pesa,SKL4AB12CD,,"3,000"');
    expect(csv).toContain('Total,"4,000"');
    expect(csv).toContain('"Mary, W"');
    expect(csv).not.toMatch(/^Group,=/m);
    expect(csv).toContain("Group,\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csv).toContain('07/11/26,"-1,000",Correction');
  });
});
