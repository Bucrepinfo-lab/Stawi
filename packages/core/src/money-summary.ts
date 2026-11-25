/**
 * One money statement for every section — by day, by week and by month
 * (owner 20/11/26).
 *
 * The group's table money (pillar 1) and the business books (pillar 3) are
 * written in different places. This module lays both on the same calendar and
 * adds them up the same way, so any section that needs a statement — the
 * papers pack, savings and credit, a bank — gets one summary that agrees with
 * itself.
 *
 * It also checks the record (reconciles it):
 *   - each meeting must open with the money the last meeting closed with;
 *   - the day, week and month totals must add up to the same amount.
 *
 * Read-only. It never moves money and never changes a record. Integer cents.
 * Dates are plain calendar days (yyyy-mm-dd); weeks start on Monday.
 */

import type { Meeting } from './minutes';
import { tableBankingSummary } from './minutes';

export type MoneyStep = 'day' | 'week' | 'month';
export type MoneySide = 'group' | 'business';

export type MoneyKind =
  | 'contributions' | 'fines' | 'other_in' | 'payouts' | 'other_out'
  | 'sales' | 'stock_bought' | 'costs';

export interface MoneyLine {
  /** yyyy-mm-dd */
  date: string;
  side: MoneySide;
  kind: MoneyKind;
  inCents: number;
  outCents: number;
}

const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(`${s.slice(0, 10)}T00:00:00Z`));
const whole = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0);

/** The group's table money, from POSTED meetings only (drafts are not yet the record). */
export function groupMoneyLines(meetings: readonly Meeting[]): MoneyLine[] {
  const out: MoneyLine[] = [];
  for (const m of meetings) {
    if (m.status !== 'POSTED' || !isDay(m.date)) continue;
    const s = tableBankingSummary(m.tableBanking);
    const date = m.date.slice(0, 10);
    const add = (kind: MoneyKind, inCents: number, outCents: number) => {
      if (inCents !== 0 || outCents !== 0) out.push({ date, side: 'group', kind, inCents, outCents });
    };
    add('contributions', s.contributionsCents, 0);
    add('fines', s.finesCents, 0);
    add('other_in', s.otherInCents, 0);
    add('payouts', 0, s.payoutCents);
    add('other_out', 0, s.otherOutCents);
  }
  return out;
}

export interface BooksEntry {
  type: 'SALE' | 'PURCHASE' | 'EXPENSE' | string;
  amountCents: number;
  /** ISO date or date-time. */
  occurredAt: string | Date;
}

/** The business's sales and costs, from its books. */
export function businessMoneyLines(entries: readonly BooksEntry[]): MoneyLine[] {
  const out: MoneyLine[] = [];
  for (const e of entries) {
    const iso = e.occurredAt instanceof Date ? (Number.isNaN(e.occurredAt.getTime()) ? '' : e.occurredAt.toISOString()) : e.occurredAt;
    if (!isDay(iso)) continue;
    const date = iso.slice(0, 10);
    const amount = Math.abs(whole(e.amountCents));
    if (amount === 0) continue;
    if (e.type === 'SALE') out.push({ date, side: 'business', kind: 'sales', inCents: amount, outCents: 0 });
    else if (e.type === 'PURCHASE') out.push({ date, side: 'business', kind: 'stock_bought', inCents: 0, outCents: amount });
    else if (e.type === 'EXPENSE') out.push({ date, side: 'business', kind: 'costs', inCents: 0, outCents: amount });
  }
  return out;
}

const DAY_MS = 86_400_000;
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The first day of the day, week (Monday) or month that `day` falls in. */
export function stepStart(day: string, step: MoneyStep): string {
  if (step === 'day') return day.slice(0, 10);
  if (step === 'month') return `${day.slice(0, 7)}-01`;
  const ms = utc(day.slice(0, 10));
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return toDay(ms - dow * DAY_MS);
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SW = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'];
const dmy = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(2, 4)}`;

export function stepLabel(start: string, step: MoneyStep, lang: 'en' | 'sw' = 'en'): string {
  if (step === 'day') return dmy(start);
  if (step === 'week') return lang === 'sw' ? `Wiki ya ${dmy(start)}` : `Week of ${dmy(start)}`;
  const month = Number(start.slice(5, 7)) - 1;
  return `${(lang === 'sw' ? MONTHS_SW : MONTHS_EN)[month] ?? ''} ${start.slice(0, 4)}`;
}

export interface MoneyBucket {
  /** First day of the period (yyyy-mm-dd). */
  start: string;
  inCents: number;
  outCents: number;
  /** In minus out. */
  leftCents: number;
  /** Per kind: in minus out is not used here — each kind is all-in or all-out. */
  byKind: Partial<Record<MoneyKind, number>>;
}

export interface MoneyTotals { inCents: number; outCents: number; leftCents: number }

/** Add lines up by day, week or month. Newest period first. */
export function summariseMoney(lines: readonly MoneyLine[], step: MoneyStep): MoneyBucket[] {
  const by = new Map<string, MoneyBucket>();
  for (const l of lines) {
    const start = stepStart(l.date, step);
    const b = by.get(start) ?? { start, inCents: 0, outCents: 0, leftCents: 0, byKind: {} };
    b.inCents += l.inCents;
    b.outCents += l.outCents;
    b.leftCents = b.inCents - b.outCents;
    b.byKind[l.kind] = (b.byKind[l.kind] ?? 0) + l.inCents + l.outCents;
    by.set(start, b);
  }
  return [...by.values()].sort((a, b) => b.start.localeCompare(a.start));
}

export function moneyTotals(rows: readonly { inCents: number; outCents: number }[]): MoneyTotals {
  let inCents = 0;
  let outCents = 0;
  for (const r of rows) { inCents += r.inCents; outCents += r.outCents; }
  return { inCents, outCents, leftCents: inCents - outCents };
}

// ── Checking the record ──────────────────────────────────────────────────

export interface MoneyCheck {
  id: 'carried_forward' | 'totals_agree';
  ok: boolean;
  text: { en: string; sw: string };
}

const kes = (cents: number) => (cents / 100).toLocaleString('en-KE');

/**
 * Each posted meeting should open with what the one before it closed with.
 * A gap is not an accusation — it is a question the officials should answer.
 * A meeting with no opening amount written (blank or 0) is skipped: there is
 * nothing to compare, and a blank must never read as missing money.
 */
export function carriedForwardGaps(meetings: readonly Meeting[]): { meetingNo: number; date: string; expectedCents: number; writtenCents: number }[] {
  const posted = meetings.filter((m) => m.status === 'POSTED' && isDay(m.date)).sort((a, b) => a.date.localeCompare(b.date) || a.meetingNo - b.meetingNo);
  const gaps: { meetingNo: number; date: string; expectedCents: number; writtenCents: number }[] = [];
  for (let i = 1; i < posted.length; i++) {
    const now = posted[i]!;
    const before = posted[i - 1]!;
    // A new meeting starts with 0 until someone writes the amount, so 0 means "not written".
    if (!now.tableBanking?.openingBalanceCents) continue;
    const expected = tableBankingSummary(before.tableBanking).closingBalanceCents;
    const written = whole(now.tableBanking.openingBalanceCents);
    if (expected !== written) gaps.push({ meetingNo: now.meetingNo, date: now.date.slice(0, 10), expectedCents: expected, writtenCents: written });
  }
  return gaps;
}

export interface MoneyStatement {
  step: MoneyStep;
  group: MoneyBucket[];
  business: MoneyBucket[];
  /** Group and business on the same calendar. */
  together: MoneyBucket[];
  totals: { group: MoneyTotals; business: MoneyTotals; together: MoneyTotals };
  /** First and last day with money written. */
  from?: string;
  to?: string;
}

export interface HarmonisedMoney {
  day: MoneyStatement;
  week: MoneyStatement;
  month: MoneyStatement;
  checks: MoneyCheck[];
  hasGroup: boolean;
  hasBusiness: boolean;
}

function statement(lines: MoneyLine[], step: MoneyStep): MoneyStatement {
  const g = lines.filter((l) => l.side === 'group');
  const b = lines.filter((l) => l.side === 'business');
  const days = lines.map((l) => l.date).sort();
  return {
    step,
    group: summariseMoney(g, step),
    business: summariseMoney(b, step),
    together: summariseMoney(lines, step),
    totals: { group: moneyTotals(g), business: moneyTotals(b), together: moneyTotals(lines) },
    from: days[0],
    to: days[days.length - 1],
  };
}

/**
 * The harmonised statement: the same money, added up by day, week and month,
 * with the checks that show it agrees with itself.
 */
export function harmoniseMoney(input: { meetings: readonly Meeting[]; entries?: readonly BooksEntry[] }): HarmonisedMoney {
  const lines = [...groupMoneyLines(input.meetings), ...businessMoneyLines(input.entries ?? [])];
  const day = statement(lines, 'day');
  const week = statement(lines, 'week');
  const month = statement(lines, 'month');

  const sums = [day, week, month].map((s) => moneyTotals(s.together));
  const agree = sums.every((s) => s.inCents === sums[0]!.inCents && s.outCents === sums[0]!.outCents);
  const gaps = carriedForwardGaps(input.meetings);
  const first = gaps[0];

  const checks: MoneyCheck[] = [
    {
      id: 'totals_agree',
      ok: agree,
      text: agree
        ? { en: 'The day, week and month totals add up to the same amount.', sw: 'Jumla za siku, wiki na mwezi zinalingana.' }
        : { en: 'The day, week and month totals do not add up to the same amount.', sw: 'Jumla za siku, wiki na mwezi hazilingani.' },
    },
    {
      id: 'carried_forward',
      ok: gaps.length === 0,
      text: first
        ? {
            en: `Meeting ${first.meetingNo} (${dmy(first.date)}) opened with ${kes(first.writtenCents)} but the meeting before closed with ${kes(first.expectedCents)}. Please check.${gaps.length > 1 ? ` ${gaps.length - 1} more to check.` : ''}`,
            sw: `Mkutano wa ${first.meetingNo} (${dmy(first.date)}) ulianza na ${kes(first.writtenCents)} lakini mkutano uliotangulia ulifunga na ${kes(first.expectedCents)}. Tafadhali kagueni.${gaps.length > 1 ? ` Kuna ${gaps.length - 1} zaidi za kukagua.` : ''}`,
          }
        : { en: 'Every meeting opens with the money the last one closed with.', sw: 'Kila mkutano unaanza na pesa ambazo mkutano uliopita ulifunga nazo.' },
    },
  ];

  return {
    day, week, month, checks,
    hasGroup: lines.some((l) => l.side === 'group'),
    hasBusiness: lines.some((l) => l.side === 'business'),
  };
}

/** Keep only the newest `limit` periods of each list (for a phone screen). */
export function trimStatement(s: MoneyStatement, limit: number): MoneyStatement {
  return { ...s, group: s.group.slice(0, limit), business: s.business.slice(0, limit), together: s.together.slice(0, limit) };
}
