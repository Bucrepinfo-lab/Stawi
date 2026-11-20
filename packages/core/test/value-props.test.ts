import { describe, expect, it } from 'vitest';
import { VALUE_PROPS, valuePillars, valueLang, valuePropsFor } from '../src/value-props';

describe('value banners: every claim is verifiable (owner 20/11/26)', () => {
  it('every banner has a pain, a fact, a named https source and a solution in English and Kiswahili', () => {
    for (const p of VALUE_PROPS) {
      for (const t of [p.pain, p.fact, p.solution, p.cta]) {
        expect(t.en.trim().length, p.id).toBeGreaterThan(8);
        expect(t.sw.trim().length, p.id).toBeGreaterThan(8);
      }
      expect(p.source.label.trim().length, p.id).toBeGreaterThan(3);
      expect(p.source.url.startsWith('https://'), p.id).toBe(true);
      expect(p.href.startsWith('/'), p.id).toBe(true);
    }
  });

  it('ids are unique and safe to use as tracking keys', () => {
    const ids = VALUE_PROPS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(/^[a-z0-9][a-z0-9._-]{0,47}$/.test(id), id).toBe(true);
  });

  it('never promises: no flattering words, and planned tools are marked coming', () => {
    const banned = /\b(guarantee|guaranteed|best|never fail|risk-free|get rich)\b/i;
    for (const p of VALUE_PROPS) {
      expect(banned.test(`${p.pain.en} ${p.solution.en} ${p.cta.en}`), p.id).toBe(false);
    }
    const coming = VALUE_PROPS.filter((p) => p.status === 'coming').map((p) => p.id);
    expect(coming).toEqual(['p1-speak', 'p2-demand', 'p3-mixed-money', 'p4-papers']);
  });

  it('every pillar has at least two live banners', () => {
    for (const pillar of [1, 2, 3, 4] as const) {
      const live = valuePropsFor(pillar, { saccoPlus: true }).filter((p) => p.status === 'live');
      expect(live.length, `pillar ${pillar}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('savings-and-loans banners show only when SACCO+ is on; live banners come first', () => {
    expect(valuePropsFor(4)).toEqual([]);
    expect(valuePropsFor(4, { saccoPlus: true }).length).toBeGreaterThan(0);
    expect(valuePillars()).toEqual([1, 2, 3]);
    expect(valuePillars({ saccoPlus: true })).toEqual([1, 2, 3, 4]);
    const p1 = valuePropsFor(1);
    expect(p1[p1.length - 1]?.status).toBe('coming');
    expect(p1[0]?.status).toBe('live');
  });

  it('no lending or interest words outside pillar 4', () => {
    const lending = /\b(loan|loans|lend|interest|borrow|mkopo|mikopo|riba)\b/i;
    for (const p of VALUE_PROPS.filter((x) => x.pillar !== 4 && x.id !== 'p1-register')) {
      expect(lending.test(`${p.pain.en} ${p.solution.en} ${p.cta.en} ${p.solution.sw}`), p.id).toBe(false);
    }
  });

  it('falls back to English for languages without a translation', () => {
    expect(valueLang('sw')).toBe('sw');
    expect(valueLang('fr')).toBe('en');
    expect(valueLang(null)).toBe('en');
  });
});
