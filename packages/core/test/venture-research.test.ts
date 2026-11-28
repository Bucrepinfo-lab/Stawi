import { describe, expect, it } from 'vitest';
import { compareIdeas, generateVentures, ideaToParam, ideasFromParams, profileFor, IDEA_CRITERIA, type Industry, type Venture } from '../src';

const v = (title: string, startupCents: number, marginPct: number, risk: Venture['risk'], industry: Industry): Venture => ({ title, description: '', startupCents, marginPct, risk, industry });

describe('venture research', () => {
  it('has a researched profile for every idea the Ideas page can show', () => {
    const industries: Industry[] = ['agri', 'retail', 'services', 'manufacturing', 'digital', 'transport'];
    for (const industry of industries) {
      for (const idea of generateVentures({ industry, capitalCents: 100_000_00, count: 10, seed: 1 })) {
        const p = profileFor(idea.title);
        expect(p, idea.title).not.toBeNull();
        expect(p!.legal.length).toBeGreaterThanOrEqual(2);
        expect(p!.risks.length).toBe(p!.protect.length);
        expect(p!.merits.length && p!.demerits.length && p!.grow.length && p!.diversify.length && p!.check.length).toBeTruthy();
      }
    }
  });

  it('criteria weights add up to 100', () => {
    expect(IDEA_CRITERIA.reduce((t, c) => t + c.weight, 0)).toBe(100);
  });

  it('ranks three ideas best, second, weakest with reasons', () => {
    const c = compareIdeas([
      v('Car wash bay', 90_000_00, 50, 'Moderate', 'services'),
      v('Egg supply route', 60_000_00, 18, 'Low', 'agri'),
      v('Cargo pickup hire', 115_000_00, 30, 'Higher', 'transport'),
    ], 120_000_00);
    expect(c.studies.map((s) => s.verdict)).toEqual(['best', 'second', 'weakest']);
    expect(c.studies[0]!.venture.title).toBe('Egg supply route');
    expect(c.studies[2]!.venture.title).toBe('Cargo pickup hire');
    for (const s of c.studies) {
      expect(s.why.length).toBeGreaterThan(0);
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
    }
    expect(c.summary).toContain('Egg supply route');
  });

  it('money sums: sales, profit and payback hold together', () => {
    const [s] = compareIdeas([v('Mini-mart kiosk', 100_000_00, 14, 'Low', 'retail')], 150_000_00).studies;
    expect(s!.monthlySalesCents).toBe(160_000_00);
    expect(s!.monthlyProfitCents).toBe(Math.round(160_000_00 * (0.14 - 0.06)));
    expect(s!.paybackMonths).toBeCloseTo(100_000_00 / s!.monthlyProfitCents, 1);
    expect(s!.leftoverCents).toBe(50_000_00);
  });

  it('flags an idea the group cannot afford yet', () => {
    const c = compareIdeas([v('Cargo pickup hire', 200_000_00, 30, 'Higher', 'transport'), v('Liquid soap & detergent', 40_000_00, 40, 'Low', 'manufacturing')], 100_000_00);
    const pickup = c.studies.find((s) => s.venture.title === 'Cargo pickup hire')!;
    expect(pickup.leftoverCents).toBe(-100_000_00);
    expect(pickup.why.join(' ')).toMatch(/needs more savings or a loan/);
    expect(c.studies[0]!.venture.title).toBe('Liquid soap & detergent');
  });

  it('says when the top two are too close to call', () => {
    const c = compareIdeas([v('Mini-mart kiosk', 50_000_00, 14, 'Low', 'retail'), v('Mini-mart kiosk', 50_000_00, 14, 'Low', 'retail')]);
    expect(c.close).toBe(true);
    expect(c.summary).toMatch(/very close/);
  });

  it('a margin below running costs never pays back', () => {
    const [s] = compareIdeas([v('Car wash bay', 50_000_00, 20, 'Moderate', 'services')]).studies;
    expect(s!.monthlyProfitCents).toBeLessThan(0);
    expect(s!.paybackMonths).toBeNull();
    expect(s!.scores.payback).toBe(0);
  });

  it('round-trips ideas through a shared link and rejects tampering', () => {
    const ideas = [v('Bread & bakery', 80_000_00, 17, 'Moderate', 'manufacturing'), v('Phone repair lab', 40_000_00, 45, 'Low', 'digital')];
    expect(ideasFromParams(ideas.map(ideaToParam)).map((i) => i.title)).toEqual(['Bread & bakery', 'Phone repair lab']);
    expect(ideasFromParams(['<script>|100|20|Low|retail', 'Mini-mart kiosk|-5|20|Low|retail', 'Mini-mart kiosk|100|20|Huge|retail', 'Mini-mart kiosk|100|200|Low|retail'])).toEqual([]);
    expect(ideasFromParams(Array(8).fill(ideaToParam(ideas[0]!)))).toHaveLength(1);
  });

  it('skips ideas with no profile instead of breaking', () => {
    expect(compareIdeas([v('Unknown thing', 10_000_00, 20, 'Low', 'retail')]).studies).toEqual([]);
  });
});
