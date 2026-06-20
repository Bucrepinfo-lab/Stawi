import { describe, it, expect } from 'vitest';
import { recommendProvider, methodsFor, buildSubscriptionCheckout } from '../src/payments';

describe('payments routing', () => {
  it('routes Kenya to M-Pesa', () => {
    expect(recommendProvider('KE')).toBe('MPESA');
  });
  it('routes Nigeria to Paystack, US/UK to Stripe', () => {
    expect(recommendProvider('NG')).toBe('PAYSTACK');
    expect(recommendProvider('US')).toBe('STRIPE');
    expect(recommendProvider('GB')).toBe('STRIPE');
  });
  it('falls back to Stripe for unmapped countries', () => {
    expect(recommendProvider('ZZ')).toBe('STRIPE');
  });
  it('exposes provider methods', () => {
    expect(methodsFor('MPESA')).toEqual(['mobile_money']);
    expect(methodsFor('STRIPE')).toContain('card');
    expect(methodsFor('FLUTTERWAVE')).toContain('mobile_money');
  });
  it('builds a subscription checkout with the right provider & amount', () => {
    const co = buildSubscriptionCheckout('GROWTH', 'KE', 'KES', 637000, 'tenant_1');
    expect(co.provider).toBe('MPESA');
    expect(co.currency).toBe('KES');
    expect(co.amountCents).toBe(637000);
    expect(co.description).toMatch(/Growth/);
    expect(co.customerRef).toBe('tenant_1');
  });
});
