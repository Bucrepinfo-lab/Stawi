import { describe, it, expect } from 'vitest';
import { computeJourney, type JourneyInput } from '../src/journey';

const fresh: JourneyInput = {
  charterPct: 0,
  postedRecords: 0,
  registered: false,
  saccoReadinessPct: 0,
  saccoActive: false,
};

describe('computeJourney', () => {
  it('always returns all four pillars in walk order 1 → 3 → 4 → 2', () => {
    const j = computeJourney(fresh);
    expect(j.pillars.map((p) => p.id)).toEqual([1, 3, 4, 2]);
  });

  it('suggests the charter first for a brand-new group with no subscription', () => {
    const j = computeJourney(fresh);
    expect(j.focus.pillarId).toBe(1);
    expect(j.focus.target).toEqual({ kind: 'tab', tab: 'charter' });
  });

  it('makes every pillar directly joinable — none locked behind Pillar 1', () => {
    const byId = Object.fromEntries(computeJourney(fresh).pillars.map((p) => [p.id, p]));
    expect(byId[2].status).toBe('available');
    expect(byId[3].status).toBe('available');
    expect(byId[4].status).toBe('available');
    // and each carries a join action
    expect(byId[3].nextAction?.target).toEqual({ kind: 'route', href: '/books' });
    expect(byId[4].nextAction?.target).toEqual({ kind: 'tab', tab: 'sacco' });
    expect(byId[2].nextAction?.target).toEqual({ kind: 'route', href: '/match' });
  });

  it('honours a direct subscription to Pillar 4 without any Pillar-1 data', () => {
    const j = computeJourney({ ...fresh, subscribedPillars: [4] });
    expect(j.focus.pillarId).toBe(4);
    expect(j.focus.label).toBe('Open a SACCO+ account');
    expect(j.focus.target).toEqual({ kind: 'tab', tab: 'sacco' });
  });

  it('honours a direct subscription to Pillar 3 (a business, no group)', () => {
    const j = computeJourney({ ...fresh, subscribedPillars: [3] });
    expect(j.focus.pillarId).toBe(3);
    expect(j.focus.target).toEqual({ kind: 'route', href: '/books' });
  });

  it('after a group finishes records, points to accounting/compliance next', () => {
    const j = computeJourney({ ...fresh, charterPct: 100, postedRecords: 2 });
    expect(j.focus.pillarId).toBe(3);
    expect(j.focus.label.length).toBeGreaterThan(3);
  });

  it('prioritises SACCO+ activation when fully lender-ready', () => {
    const j = computeJourney({ ...fresh, charterPct: 100, postedRecords: 3, registered: true, saccoReadinessPct: 100, saccoActive: false });
    expect(j.focus.pillarId).toBe(4);
    const p4 = j.pillars.find((p) => p.id === 4)!;
    expect(p4.status).toBe('ready');
  });

  it('marks SACCO+ active and keeps overall progress high', () => {
    const j = computeJourney({ charterPct: 100, postedRecords: 4, registered: true, booksStarted: true, matchingStarted: true, saccoReadinessPct: 100, saccoActive: true });
    const p4 = j.pillars.find((p) => p.id === 4)!;
    expect(p4.status).toBe('active');
    expect(p4.pct).toBe(100);
    expect(j.overallPct).toBe(100);
  });

  it('every pillar exposes a 0–100 pct and a plain-language summary', () => {
    const j = computeJourney({ ...fresh, charterPct: 55, postedRecords: 1, saccoReadinessPct: 60 });
    for (const p of j.pillars) {
      expect(p.pct).toBeGreaterThanOrEqual(0);
      expect(p.pct).toBeLessThanOrEqual(100);
      expect(p.summary.length).toBeGreaterThan(3);
    }
  });
});
