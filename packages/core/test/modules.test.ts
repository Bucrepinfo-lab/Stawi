import { describe, expect, it } from 'vitest';
import {
  MODULES, MODULE_IDS, START_CHOICES, WELCOME_NOTES, booksOnly, defaultModules, groupTabsFor, offeredModules,
  resolveModules, sanitizeModules, startChoice, watchAllowed, welcomeNotes,
} from '../src/modules';
import { ESCALATION_RULES } from '../src/escalation';

describe('a group opens only the rooms it wants', () => {
  it('a group starts with everything; a business starts with the books alone', () => {
    const g = resolveModules(null, { groupType: 'CHAMA', savingsCredit: true });
    expect(Object.values(g).every(Boolean)).toBe(true);
    const b = resolveModules(undefined, { groupType: 'BUSINESS', savingsCredit: true });
    expect(b).toEqual({ meetings: false, agendas: false, officials: false, money: false, messages: false, ideas: false, books: true, savings_credit: false });
    expect(booksOnly(b)).toBe(true);
    expect(booksOnly(g)).toBe(false);
  });

  it('a saved choice wins, and junk is dropped', () => {
    const m = resolveModules({ officials: false, money: false, hacked: true, ideas: 'no' }, { groupType: 'CHAMA', savingsCredit: false });
    expect(m.officials).toBe(false);
    expect(m.money).toBe(false);
    expect(m.ideas).toBe(true);
    expect(Object.keys(m).sort()).toEqual([...MODULE_IDS].sort());
    expect(sanitizeModules('x')).toEqual({});
    expect(sanitizeModules({ books: 1, meetings: false })).toEqual({ meetings: false });
  });

  it('agenda items need meetings; savings and credit needs the platform switch', () => {
    expect(resolveModules({ meetings: false, agendas: true }, {}).agendas).toBe(false);
    expect(resolveModules({ savings_credit: true }, { savingsCredit: false }).savings_credit).toBe(false);
    expect(resolveModules({ savings_credit: true }, { savingsCredit: true }).savings_credit).toBe(true);
    expect(offeredModules({ savingsCredit: false }).map((m) => m.id)).not.toContain('savings_credit');
    expect(offeredModules({ savingsCredit: true })).toHaveLength(MODULES.length);
  });

  it('tabs and watches follow the switches', () => {
    const organise = startChoice('organise').modules;
    expect(groupTabsFor(organise)).toEqual(['charter', 'minutes', 'documents']);
    expect(groupTabsFor(startChoice('books_only').modules)).toEqual(['charter']);
    expect(groupTabsFor(resolveModules(null, { savingsCredit: true }))).toEqual(['charter', 'minutes', 'documents', 'statement', 'sacco']);
    expect(watchAllowed('contributions_not_recorded', organise)).toBe(false);
    expect(watchAllowed('member_behind', organise)).toBe(false);
    expect(watchAllowed('minutes_not_posted', organise)).toBe(true);
    expect(watchAllowed('rules_missing', startChoice('books_only').modules)).toBe(true);
    expect(watchAllowed('officials_missing', resolveModules({ officials: false }, {}))).toBe(false);
    for (const rule of Object.keys(ESCALATION_RULES)) expect(typeof watchAllowed(rule as never, organise)).toBe('boolean');
  });
});

describe('ways to start', () => {
  it('offers a full group, a meetings-only group and a business with no group', () => {
    expect(START_CHOICES.map((c) => [c.id, c.type])).toEqual([['everything', 'CHAMA'], ['organise', 'CHAMA'], ['books_only', 'BUSINESS']]);
    expect(startChoice('nope').id).toBe('everything');
    expect(defaultModules('business').books).toBe(true);
    expect(defaultModules('business').money).toBe(false);
    expect(startChoice('organise').modules.money).toBe(false);
    expect(startChoice('organise').modules.savings_credit).toBe(false);
  });
});

describe('the welcome is warm and true', () => {
  it('has both languages and no pressure or unkept promise', () => {
    for (const n of WELCOME_NOTES) {
      for (const t of [n.title, n.body, n.cta]) {
        expect(t.en.length).toBeGreaterThan(8);
        expect(t.sw.length).toBeGreaterThan(8);
        expect(t.en).not.toMatch(/guarantee|best|never lose|risk-free|hurry|last chance|only today|cheapest|#1/i);
      }
      expect(START_CHOICES.some((c) => c.id === n.start)).toBe(true);
    }
    for (const m of MODULES) for (const t of [m.name, m.on, m.off]) expect(t.sw.length).toBeGreaterThan(5);
  });

  it('says nothing about savings and credit while it is switched off', () => {
    const off = welcomeNotes({ savingsCredit: false });
    expect(off.map((n) => n.id)).toEqual(['organise', 'keep_bank', 'business']);
    expect(welcomeNotes({ savingsCredit: true }).map((n) => n.id)).toContain('moving');
    expect(off.find((n) => n.id === 'keep_bank')!.body.en).toContain('You do not have to move your money to use Stawi');
    for (const n of off) expect(`${n.title.en} ${n.body.en} ${n.cta.en}`).not.toMatch(/loan|borrow|credit|lend/i);
  });
});

describe('messages is a switch like any other', () => {
  it('is on for groups, off for a business on its own, and can be switched off', () => {
    expect(resolveModules(null, { groupType: 'CHAMA' }).messages).toBe(true);
    expect(startChoice('organise').modules.messages).toBe(true);
    expect(defaultModules('BUSINESS').messages).toBe(false);
    expect(resolveModules({ messages: false }, { groupType: 'CHAMA' }).messages).toBe(false);
  });
});
