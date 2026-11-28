/**
 * Business books: the level a business works at, and the plain-language brief
 * shown at the top of each statement (owner 28/11/26: simple and encouraging
 * for anyone, complete for an accountant).
 */
import { formatMoney } from './capital';
import type { BizStatement, BizPeriod } from './biz-books';

/**
 * One set of books, three ways of showing it. The data is the same, so a
 * business can move up a level any day without losing anything.
 */
export type BizLevel = 'SIMPLE' | 'GROWING' | 'BUSY';

export const BIZ_LEVELS: { id: BizLevel; en: string; sw: string; about: string; aboutSw: string; features: string[] }[] = [
  {
    id: 'SIMPLE', en: 'Simple', sw: 'Rahisi',
    about: 'A kiosk, a stall, a salon or one-person business. Write what came in and what went out. Stawi does the sums.',
    aboutSw: 'Kioski, kibanda, saluni au biashara ya mtu mmoja. Andika kilichoingia na kilichotoka. Stawi inafanya hesabu.',
    features: ['Sales and costs in two taps', 'Today’s profit', 'Cash and M-Pesa count at day end', 'Who owes you'],
  },
  {
    id: 'GROWING', en: 'Growing', sw: 'Inayokua',
    about: 'A shop with many goods. Track each item: what sells fast, what is not moving, what is running out.',
    aboutSw: 'Duka lenye bidhaa nyingi. Fuatilia kila bidhaa: inayouzika haraka, isiyouzika, inayokaribia kuisha.',
    features: ['Everything in Simple', 'Items, prices and stock', 'Fast-going, slow and not moving', 'Running-out alerts', 'Suppliers you owe'],
  },
  {
    id: 'BUSY', en: 'Busy', sw: 'Yenye shughuli nyingi',
    about: 'A busy business, or one with branches and staff. See every branch from anywhere, and give your accountant full books.',
    aboutSw: 'Biashara yenye shughuli nyingi, au yenye matawi na wafanyakazi. Ona kila tawi popote ulipo, mpe mhasibu vitabu kamili.',
    features: ['Everything in Growing', 'Branches side by side', 'Staff record only for their branch', 'Trial balance, balance sheet, general ledger', 'Audit trail of every entry'],
  },
];

const kes = (c: number) => `KES ${formatMoney(Math.abs(c))}`;
const PERIOD_WORD: Record<BizPeriod, { now: string; before: string }> = {
  day: { now: 'today', before: 'the day before' },
  week: { now: 'this week', before: 'last week' },
  month: { now: 'this month', before: 'last month' },
  year: { now: 'this year', before: 'last year' },
};

export interface BriefLine { tone: 'good' | 'bad' | 'info'; text: string }

/**
 * Three to five sentences anyone can read: did we make money, how it compares,
 * where the money is, and the one thing to do next.
 */
export function bizBrief(now: BizStatement, before: BizStatement | null, period: BizPeriod, label?: string): BriefLine[] {
  const w = PERIOD_WORD[period];
  const when = label ?? w.now;
  const out: BriefLine[] = [];
  if (now.entries === 0) {
    out.push({ tone: 'info', text: `Nothing written ${when} yet. Tap "I sold" after your first sale and Stawi shows your profit straight away.` });
    return out;
  }
  if (now.netProfitCents > 0) out.push({ tone: 'good', text: `You made ${kes(now.netProfitCents)} profit ${when}, from ${kes(now.salesCents)} of sales.` });
  else if (now.netProfitCents < 0) out.push({ tone: 'bad', text: `You spent ${kes(now.netProfitCents)} more than you earned ${when}. Sales were ${kes(now.salesCents)}.` });
  else out.push({ tone: 'info', text: `You broke even ${when}: sales of ${kes(now.salesCents)} covered the costs exactly.` });

  // Money cannot really be below zero: usually the starting balance was never written.
  const below = (['CASH', 'MPESA', 'BANK'] as const).filter((c) => now.money[c].closingCents < 0);
  if (below.length) {
    const names = below.map((c) => (c === 'CASH' ? 'the cash' : c === 'MPESA' ? 'M-Pesa' : 'the bank')).join(' and ');
    out.push({ tone: 'bad', text: `The books show ${names} below zero. Usually the starting balance is missing: write it once with "What I have today", or check for money that came in but was not written.` });
  }

  if (before && before.salesCents > 0) {
    const change = Math.round(((now.salesCents - before.salesCents) / before.salesCents) * 100);
    if (change >= 5) out.push({ tone: 'good', text: `Sales are up ${change}% on ${w.before}.` });
    else if (change <= -5) out.push({ tone: 'bad', text: `Sales are down ${-change}% on ${w.before}.` });
    else out.push({ tone: 'info', text: `Sales are about the same as ${w.before}.` });
  }
  if (now.salesCents > 0 && now.costOfGoodsCents > 0) {
    out.push({ tone: now.grossMarginPct >= 15 ? 'good' : 'bad', text: `Out of every KES 100 sold, KES ${Math.round(now.grossMarginPct)} is left after paying for the goods.` });
  }
  if (now.cashDiffCents > 0) out.push({ tone: 'bad', text: `The count was ${kes(now.cashDiffCents)} short. Check sales that were not written down, and who held the till.` });
  if (now.customersOweCents > 0) out.push({ tone: 'info', text: `Customers owe you ${kes(now.customersOweCents)}. Remind the oldest first.` });
  if (now.ownerOutCents > now.netProfitCents && now.ownerOutCents > 0 && now.netProfitCents >= 0) {
    out.push({ tone: 'bad', text: `You took out ${kes(now.ownerOutCents)}, more than the profit. The business is getting smaller.` });
  }
  return out.slice(0, 5);
}
