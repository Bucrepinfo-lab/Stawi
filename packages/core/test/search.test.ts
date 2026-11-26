import { describe, expect, it } from 'vitest';
import { amountQuery, matches, normalise, searchPlaces } from '../src/search';

/** Owner 26/11/26: a search on every screen, English or Kiswahili. */
describe('search', () => {
  it('matches every word, any order, any case', () => {
    expect(normalise('  Grace  WANJIKŨ! ')).toBe('grace wanjiku');
    expect(matches('Grace Wanjiku', 'wanjiku gr')).toBe(true);
    expect(matches('Grace Wanjiku', 'peter')).toBe(false);
    expect(matches('anything', '   ')).toBe(false);
  });
  it('reads amounts', () => {
    expect(amountQuery('5,000')).toBe(500000);
    expect(amountQuery('KES 2500')).toBe(250000);
    expect(amountQuery('grace')).toBeNull();
  });
  it('finds the app places in English and Kiswahili', () => {
    expect(searchPlaces('loan')[0]!.href).toBe('/proposal');
    expect(searchPlaces('lugha')[0]!.title).toMatch(/language/i);
    expect(searchPlaces('pin').some((p) => p.href === '/profile')).toBe(true);
  });
});
