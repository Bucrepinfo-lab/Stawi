import { describe, it, expect } from 'vitest';
import {
  isSaccoPlusEnabled,
  assertSaccoPlusEnabled,
  FeatureDisabledError,
  isSaccoPlusPath,
  isFlagOn,
} from '../src/features';
import { computeJourney } from '../src/journey';

describe('SACCO_PLUS_ENABLED flag', () => {
  it('is OFF by default (unset, empty, or anything but an explicit opt-in)', () => {
    expect(isSaccoPlusEnabled({})).toBe(false);
    expect(isSaccoPlusEnabled({ SACCO_PLUS_ENABLED: '' })).toBe(false);
    expect(isSaccoPlusEnabled({ SACCO_PLUS_ENABLED: 'false' })).toBe(false);
    expect(isSaccoPlusEnabled({ SACCO_PLUS_ENABLED: '0' })).toBe(false);
    expect(isSaccoPlusEnabled({ SACCO_PLUS_ENABLED: 'maybe' })).toBe(false);
  });

  it('turns on only for explicit truthy values', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'on', ' true ']) {
      expect(isFlagOn(v)).toBe(true);
      expect(isSaccoPlusEnabled({ SACCO_PLUS_ENABLED: v })).toBe(true);
    }
  });

  it('assertSaccoPlusEnabled throws a 404-mapped FeatureDisabledError when off', () => {
    let caught: unknown;
    try {
      assertSaccoPlusEnabled({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(FeatureDisabledError);
    expect((caught as FeatureDisabledError).status).toBe(404);
    expect(() => assertSaccoPlusEnabled({ SACCO_PLUS_ENABLED: 'true' })).not.toThrow();
  });

  it('identifies SACCO+ request paths for middleware 404s', () => {
    expect(isSaccoPlusPath('/sacco')).toBe(true);
    expect(isSaccoPlusPath('/sacco/anything')).toBe(true);
    expect(isSaccoPlusPath('/api/sacco/txn')).toBe(true);
    expect(isSaccoPlusPath('/api/loans')).toBe(true);
    expect(isSaccoPlusPath('/saccos-guide')).toBe(false);
    expect(isSaccoPlusPath('/dashboard')).toBe(false);
    expect(isSaccoPlusPath('/formalize')).toBe(false);
  });
});

describe('journey with SACCO+ off', () => {
  const base = { charterPct: 0, postedRecords: 0, registered: false, saccoReadinessPct: 100, saccoActive: false };

  it('drops Pillar 4 entirely when the flag is not set (fails closed)', () => {
    const j = computeJourney(base);
    expect(j.pillars.map((p) => p.id)).toEqual([1, 3, 2]);
    expect(JSON.stringify(j)).not.toMatch(/credit|loan|sacco/i);
  });

  it('never focuses Pillar 4 even if it was subscribed or fully ready', () => {
    const j = computeJourney({ ...base, charterPct: 100, postedRecords: 3, registered: true, subscribedPillars: [4] });
    expect(j.focus.pillarId).not.toBe(4);
    expect(j.focus.target).not.toEqual({ kind: 'tab', tab: 'sacco' });
  });

  it('falls back to the statement when everything else is engaged', () => {
    const j = computeJourney({ ...base, charterPct: 100, postedRecords: 3, registered: true, booksStarted: true, matchingStarted: true });
    expect(j.focus.target).toEqual({ kind: 'tab', tab: 'statement' });
    expect(j.overallPct).toBe(100);
  });
});
