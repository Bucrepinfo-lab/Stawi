import { describe, expect, it } from 'vitest';
import { COLLECT_TIPS, COLLECT_WAYS, checkPaymentRef, collectWay, isDuplicateRef } from '../src/collect-ways';

describe('writing in a payment made outside the app', () => {
  it('knows four ways money comes in', () => {
    expect(COLLECT_WAYS.map((w) => [w.id, w.channel])).toEqual([
      ['CASH', 'CASH'], ['MPESA_TILL', 'MPESA_C2B'], ['MPESA_PHONE', 'MPESA_C2B'], ['BANK', 'BANK'],
    ]);
    expect(collectWay('BANK')).toBe('BANK');
    expect(collectWay('anything')).toBe('CASH');
  });

  it('checks an M-Pesa code but does not force one', () => {
    expect(checkPaymentRef('MPESA_TILL', ' skl4ab12cd ')).toEqual({ ok: true, ref: 'SKL4AB12CD' });
    expect(checkPaymentRef('MPESA_PHONE', '')).toEqual({ ok: true, ref: null });
    expect(checkPaymentRef('MPESA_PHONE', 'SKL4AB').ok).toBe(false);
    expect(checkPaymentRef('CASH', 'whatever')).toEqual({ ok: true, ref: null });
    expect(checkPaymentRef('BANK', 'FT-2611/0042')).toEqual({ ok: true, ref: 'FT-2611/0042' });
    expect(checkPaymentRef('BANK', 'bad ref!').ok).toBe(false);
  });

  it('refuses the same M-Pesa code twice', () => {
    expect(isDuplicateRef('SKL4AB12CD', ['skl4ab12cd'])).toBe(true);
    expect(isDuplicateRef('SKL4AB12CD', [null, 'OTHER00000'])).toBe(false);
    expect(isDuplicateRef(null, ['X'])).toBe(false);
  });
});

describe('the encouragement is kind and checkable', () => {
  it('has both languages, sources where it states facts, and no pressure', () => {
    for (const t of COLLECT_TIPS) {
      for (const w of [t.title, t.body]) {
        expect(w.en.length).toBeGreaterThan(10);
        expect(w.sw.length).toBeGreaterThan(10);
        expect(w.en).not.toMatch(/must|required by law|illegal|penalt|hurry|guarantee/i);
      }
    }
    expect(COLLECT_TIPS.find((t) => t.id === 'pochi')!.source!.url).toContain('safaricom.co.ke');
    expect(COLLECT_TIPS.find((t) => t.id === 'till')!.source!.url).toContain('safaricom.co.ke');
    expect(COLLECT_TIPS.find((t) => t.id === 'meanwhile')!.body.en).toContain('Every member sees the group total');
  });
});
