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

  it('sends a brand-new group to finish its charter first', () => {
    const j = computeJourney(fresh);
    expect(j.focus.pillarId).toBe(1);
    expect(j.focus.target).toEqual({ kind: 'tab', tab: 'charter' });
    expect(j.overallPct).toBe(0);
  });

  it('locks later pillars until the foundation exists', () => {
    const byId = Object.fromEntries(computeJourney(fresh).pillars.map((p) => [p.id, p]));
    expect(byId[4].status).toBe('locked'); // no records yet
    expect(byId[2].status).toBe('locked'); // charter incomplete
    expect(byId[3].status).toBe('locked'); // roster too thin
  });

  it('once records exist but not registered, focus moves to registration', () => {
    const j = computeJourney({ ...fresh, charterPct: 100, postedRecords: 2 });
    expect(j.focus.pillarId).toBe(3);
    expect(j.focus.target).toEqual({ kind: 'route', href: '/formalize' });
  });

  it('prioritises SACCO+ activation when fully lender-ready', () => {
    const j = computeJourney({ ...fresh, charterPct: 100, postedRecords: 3, registered: true, saccoReadinessPct: 100, saccoActive: false });
    expect(j.focus.pillarId).toBe(4);
    expect(j.focus.target).toEqual({ kind: 'tab', tab: 'sacco' });
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

  it('nudges toward book-keeping after registration when SACCO+ not ready', () => {
    const j = computeJourney({ ...fresh, charterPct: 100, postedRecords: 1, registered: true, booksStarted: false, saccoReadinessPct: 40 });
    // records done, registered, SACCO+ only available (not ready) → next is SACCO+ readiness or books
    expect([3, 4]).toContain(j.focus.pillarId);
    expect(j.focus.label.length).toBeGreaterThan(3);
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
