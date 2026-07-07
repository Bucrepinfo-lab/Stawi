import { describe, it, expect } from 'vitest';
import {
  vatFromGross,
  computePaye,
  computeBusinessTaxes,
  subscriptionDueCents,
} from '../src/tax';

describe('VAT', () => {
  it('extracts the 16% VAT portion from a gross figure', () => {
    // gross 116 -> VAT 16
    expect(vatFromGross(11_600)).toBe(1_600);
  });
});

describe('PAYE progressive bands', () => {
  it('taxes the first band at 10%', () => {
    // 20,000 monthly, all in first band (<= 24,000) -> 10%
    expect(computePaye(20_000 * 100)).toBe(2_000 * 100);
  });

  it('applies multiple bands progressively', () => {
    // 30,000: first 24,000 @10% = 2,400; next 6,000 @25% = 1,500; total 3,900
    expect(computePaye(30_000 * 100)).toBe(3_900 * 100);
  });

  it('is monotonic — more salary never means less tax', () => {
    let prev = -1;
    for (const s of [10_000, 24_000, 32_333, 100_000, 500_000, 900_000]) {
      const t = computePaye(s * 100);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });
});

describe('computeBusinessTaxes', () => {
  it('returns VAT only when registered', () => {
    const lines = computeBusinessTaxes({
      country: 'KE',
      grossSalesCents: 116_000 * 100,
      vatRegistered: true,
      tourismSector: false,
    });
    expect(lines.map((l) => l.code)).toEqual(['VAT']);
    expect(lines[0]!.amountCents).toBe(16_000 * 100);
  });

  it('adds the 2% tourism/catering levy for the tourism sector', () => {
    const lines = computeBusinessTaxes({
      country: 'KE',
      grossSalesCents: 100_000 * 100,
      vatRegistered: false,
      tourismSector: true,
    });
    const levy = lines.find((l) => l.code === 'TOURISM_LEVY');
    expect(levy?.amountCents).toBe(2_000 * 100);
  });

  it('exempts small manufacturers from the standards levy', () => {
    const lines = computeBusinessTaxes({
      country: 'KE',
      grossSalesCents: 0,
      vatRegistered: false,
      tourismSector: false,
      manufacturingTurnoverCents: 1_000_000 * 100, // below 5M exemption
    });
    expect(lines.find((l) => l.code === 'STANDARDS_LEVY')).toBeUndefined();
  });
});

describe('subscription (first month free)', () => {
  it('charges nothing in month 1', () => {
    expect(subscriptionDueCents(1)).toBe(0);
  });
  it('charges 10 units from month 2', () => {
    expect(subscriptionDueCents(2)).toBe(10 * 100);
  });
});
