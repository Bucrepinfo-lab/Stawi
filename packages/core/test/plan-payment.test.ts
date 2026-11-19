import { describe, it, expect } from 'vitest';
import { PLAN_PAYER_ROLES, planPaymentCovers, planPeriodEndAfterPayment } from '../src/plan-payment';

describe('Stawi plan paid by M-Pesa (owner 19/11/26)', () => {
  const now = new Date('2026-11-19T12:00:00Z');

  it('a month or a year runs from now when nothing paid is running', () => {
    expect(planPeriodEndAfterPayment(null, now, 'MONTH').toISOString()).toBe('2026-12-19T12:00:00.000Z');
    expect(planPeriodEndAfterPayment(new Date('2026-10-01T00:00:00Z'), now, 'YEAR').toISOString()).toBe('2027-11-19T12:00:00.000Z');
  });

  it('a payment adds after a period that is still running', () => {
    expect(planPeriodEndAfterPayment(new Date('2026-12-05T00:00:00Z'), now, 'MONTH').toISOString()).toBe('2027-01-05T00:00:00.000Z');
  });

  it('keeps month ends sensible', () => {
    expect(planPeriodEndAfterPayment(null, new Date('2027-01-31T00:00:00Z'), 'MONTH').toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });

  it('only a full payment counts', () => {
    expect(planPaymentCovers(299, 29_900)).toBe(true);
    expect(planPaymentCovers(300, 29_900)).toBe(true);
    expect(planPaymentCovers(298, 29_900)).toBe(false);
    expect(planPaymentCovers(undefined, 29_900)).toBe(false);
  });

  it('only the chairman or treasurer pays the plan', () => {
    expect(PLAN_PAYER_ROLES.has('CHAIRMAN')).toBe(true);
    expect(PLAN_PAYER_ROLES.has('TREASURER')).toBe(true);
    expect(PLAN_PAYER_ROLES.has('MEMBER')).toBe(false);
  });
});
