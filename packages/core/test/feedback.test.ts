import { describe, expect, it } from 'vitest';
import { contributionNotRecorded, contributionRecorded } from '../src/feedback';
import { formatMoney } from '../src/capital';

/** Owner 26/11/26: a clear banner the moment the treasurer records a contribution. */
describe('contribution feedback', () => {
  it('says who, how much, how it was paid and the new total', () => {
    const f = contributionRecorded({ name: 'Grace Wanjiku', amountCents: 200_000, way: 'Cash at the meeting', totalCents: 6_450_000 });
    expect(f.title).toBe('Contribution recorded');
    expect(f.detail).toContain(`KES ${formatMoney(200_000)} from Grace Wanjiku`);
    expect(f.detail).toContain('cash at the meeting');
    expect(f.detail).toContain(`New group total KES ${formatMoney(6_450_000)}`);
  });

  it('never leaves a failure silent', () => {
    expect(contributionNotRecorded('Only the group treasurer can record contributions.').detail).toContain('treasurer');
    expect(contributionNotRecorded(null).detail).toMatch(/Nothing was saved/);
  });
});

describe('check before recording (owner 26/11/26)', () => {
  it('reads back everything typed, amount first', async () => {
    const { contributionConfirm } = await import('../src/feedback');
    const c = contributionConfirm({ name: 'Mary Wanjiru', amountCents: 250_000, way: 'Cash at the meeting', witnesses: ['Peter Otieno', 'Ann Njeri'] });
    expect(c.title).toBe('Record this contribution?');
    expect(c.amount).toBe('KES 2,500');
    expect(c.lines.map((l) => l.label)).toEqual(['Member', 'How it was paid', 'Witnesses']);
    expect(c.lines[2]!.value).toBe('Peter Otieno and Ann Njeri');
    expect(c.yes).toBe('Yes, record it');
    expect(c.no).toBe('Cancel');
    expect(c.warning).toBeNull();
  });
  it('warns when the amount looks like an extra zero', async () => {
    const { contributionConfirm } = await import('../src/feedback');
    expect(contributionConfirm({ name: 'A', amountCents: 5_000_000, way: 'Cash', memberTotalCents: 500_000 }).warning).toMatch(/zeros/);
    expect(contributionConfirm({ name: 'A', amountCents: 500_000, way: 'Cash', memberTotalCents: 500_000 }).warning).toBeNull();
  });
  it('M-Pesa request confirm names the phone', async () => {
    const { stkConfirm } = await import('../src/feedback');
    expect(stkConfirm({ name: 'A', amountCents: 100_00, phone: '0712 345 678' }).lines[1]!.value).toBe('0712 345 678');
  });
});
