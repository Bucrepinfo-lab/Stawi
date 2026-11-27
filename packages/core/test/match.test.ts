import { describe, it, expect } from 'vitest';
import {
  generateVentures,
  canAddToShortlist,
  readSavedMatch,
  type Venture,
} from '../src/match';

describe('generateVentures', () => {
  it('returns ventures within the available capital', () => {
    const cap = 120_000 * 100;
    const v = generateVentures({ industry: 'agri', capitalCents: cap, seed: 1 });
    expect(v.length).toBeGreaterThan(0);
    for (const x of v) {
      expect(x.startupCents).toBeLessThanOrEqual(cap);
      expect(x.startupCents).toBeGreaterThan(0);
      expect(x.industry).toBe('agri');
    }
  });

  it('is deterministic for a given seed (testable re-roll)', () => {
    const a = generateVentures({ industry: 'retail', capitalCents: 50_000 * 100, seed: 42 });
    const b = generateVentures({ industry: 'retail', capitalCents: 50_000 * 100, seed: 42 });
    expect(a).toEqual(b);
  });

  it('produces different sets for different seeds (the re-roll button)', () => {
    const a = generateVentures({ industry: 'services', capitalCents: 80_000 * 100, seed: 1 });
    const b = generateVentures({ industry: 'services', capitalCents: 80_000 * 100, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('rejects non-positive capital', () => {
    expect(() => generateVentures({ industry: 'agri', capitalCents: 0 })).toThrow();
  });
});

describe('canAddToShortlist (save at least 3, max 3)', () => {
  const v = (n: number): Venture => ({
    title: `v${n}`, description: '', startupCents: 1, marginPct: 1, risk: 'Low', industry: 'agri',
  });
  it('allows up to 3', () => {
    expect(canAddToShortlist([])).toBe(true);
    expect(canAddToShortlist([v(1), v(2)])).toBe(true);
  });
  it('blocks the 4th', () => {
    expect(canAddToShortlist([v(1), v(2), v(3)])).toBe(false);
  });
});

describe('readSavedMatch', () => {
  const v = generateVentures({ industry: 'retail', capitalCents: 80_000 * 100, seed: 3 });

  it('brings back what the member saved, so the shortlist survives a tab change', () => {
    const back = readSavedMatch(JSON.parse(JSON.stringify({ industry: 'retail', capital: '80,000', seed: 3, saved: v.slice(0, 2) })));
    expect(back).toEqual({ industry: 'retail', capital: '80,000', seed: 3, saved: v.slice(0, 2) });
  });

  it('never returns more than three ideas, and drops repeats', () => {
    const back = readSavedMatch({ industry: 'retail', capital: '1', seed: 1, saved: [v[0], v[0], ...v] });
    expect(back?.saved.length).toBe(Math.min(3, new Set(v.map((x) => x.title)).size));
    expect(new Set(back?.saved.map((x) => x.title)).size).toBe(back?.saved.length);
  });

  it('drops malformed entries and rejects junk', () => {
    expect(readSavedMatch(null)).toBeNull();
    expect(readSavedMatch('x')).toBeNull();
    expect(readSavedMatch({ industry: 'weapons', saved: [] })).toBeNull();
    const back = readSavedMatch({ industry: 'agri', capital: 5, seed: 'a', saved: [{ title: 'x' }, { ...v[0], startupCents: -1 }, { ...v[0], risk: 'Wild' }] });
    expect(back).toEqual({ industry: 'agri', capital: '', seed: 1, saved: [] });
  });
});
