import { describe, it, expect } from 'vitest';
import { getCountryProfile, formatCurrencyFor, indicativeConsumptionTax, SUPPORTED_COUNTRIES } from '../src/compliance';

describe('compliance registry', () => {
  it('covers multiple regions', () => {
    expect(SUPPORTED_COUNTRIES.length).toBeGreaterThanOrEqual(10);
    const regions = new Set(SUPPORTED_COUNTRIES.map((c) => c.region));
    expect(regions.size).toBeGreaterThanOrEqual(5);
  });
  it('returns Kenya profile with VAT 16%', () => {
    const ke = getCountryProfile('KE');
    expect(ke.currency).toBe('KES');
    expect(ke.consumptionTaxRate).toBe(0.16);
    expect(ke.taxAuthority).toMatch(/KRA/);
  });
  it('falls back to KE for unknown codes', () => {
    expect(getCountryProfile('ZZ').code).toBe('KE');
  });
  it('formats currency per country', () => {
    expect(formatCurrencyFor(500000, 'US')).toContain('5,000');
    expect(formatCurrencyFor(500000, 'GB')).toMatch(/£|GBP/);
  });
  it('computes indicative consumption tax (UK 20% from gross)', () => {
    expect(indicativeConsumptionTax(12000, 'GB')).toBe(2000); // 12000 incl 20% -> 2000
    expect(indicativeConsumptionTax(10000, 'US')).toBe(0);    // no federal sales tax default
  });
});
