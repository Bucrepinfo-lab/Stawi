import { describe, it, expect } from 'vitest';
import { buildReceiptModel, receiptNumber } from '../src/receipt';

describe('receipt', () => {
  it('derives a stable receipt number', () => {
    expect(receiptNumber('abc')).toBe(receiptNumber('abc'));
    expect(receiptNumber('abc')).toMatch(/^STW-[0-9A-Z]{6}$/);
    expect(receiptNumber('abc')).not.toBe(receiptNumber('xyz'));
  });

  it('builds a receipt model with formatted money', () => {
    const r = buildReceiptModel({
      groupName: 'Umoja Women Group',
      memberName: 'Amina Wanjiru',
      amountCents: 500_000,
      runningCapitalCents: 4_700_000,
      dateISO: '2026-06-20T09:05:00.000Z',
      channel: 'MPESA_STK',
      reference: 'SGR7XYZ123',
      contributionId: 'c-1',
    });
    expect(r.amountDisplay).toBe('KES 5,000');
    expect(r.runningCapitalDisplay).toBe('KES 47,000');
    expect(r.channelLabel).toBe('M-Pesa (STK Push)');
    expect(r.reference).toBe('SGR7XYZ123');
    expect(r.receiptNo).toMatch(/^STW-/);
  });

  it('falls back to a dash when no reference', () => {
    const r = buildReceiptModel({
      groupName: 'G', memberName: 'M', amountCents: 100, runningCapitalCents: 100,
      dateISO: '2026-06-20T09:05:00.000Z', channel: 'CASH', contributionId: 'x',
    });
    expect(r.reference).toBe('—');
    expect(r.channelLabel).toBe('Cash');
  });
});
