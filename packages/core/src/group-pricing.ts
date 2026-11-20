/**
 * Stawi group subscription prices (owner decision 18/11/26).
 *
 * - Priced per group, in the country's own currency.
 * - Kenya: KES 299 a month, or KES 2,990 a year paid ahead (a year = 10 months'
 *   price). A group of 10 members or fewer pays KES 149 (KES 1,490 a year).
 * - The first month is always free.
 * - Founding price lock: a group that joins in the first 12 months after launch
 *   keeps the founding price below for as long as it stays subscribed (its
 *   subscription is never CANCELLED). Later price changes apply only to groups
 *   that join after the founding window, through STAWI_GROUP_PRICES.
 * - Approved by the owner: Kenya, then Uganda, Tanzania, Rwanda, Nigeria, South
 *   Africa and Ghana (20/11/26, "approve all prices"). The rest of the world is
 *   INDICATIVE (near the same value, card through Paddle) until approved.
 *
 * Money is integer minor units (cents). Nothing here moves money: it only says
 * what a group would be asked to pay.
 *
 * Owner approval 20/11/26 (16:20, after researching what others charge,
 * docs/PRICING-PROPOSAL-2026-11.md): in Kenya a group pays per member —
 * KES 10 a member a month, at least KES 50, at most KES 299 — and a group that
 * uses meetings and minutes only pays half (KES 5 a member, 30 to 149). The
 * other countries keep the per-group prices above until their own per-member
 * table is approved. The business books have their own price (`quoteBooks`).
 */

import { getCountryProfile } from './compliance';

/** A group of this many members or fewer pays the small-group price. */
export const SMALL_GROUP_MAX_MEMBERS = 10;
/** A year paid ahead costs this many months' price (two months free). */
export const YEAR_PLAN_MONTHS_PAID = 10;
/** Groups that join within this many months after launch keep the founding price. */
export const FOUNDING_MONTHS = 12;

export type BillingPeriod = 'MONTH' | 'YEAR';

export interface GroupPriceList {
  country: string;
  currency: string;
  /** Monthly price for a group of more than 10 members. */
  monthlyCents: number;
  /** Monthly price for a group of 10 members or fewer. */
  smallMonthlyCents: number;
  /** True once the owner has approved this country's price. */
  approved: boolean;
}

const row = (country: string, currency: string, monthly: number, small: number, approved = false): GroupPriceList => ({
  country,
  currency,
  monthlyCents: monthly,
  smallMonthlyCents: small,
  approved,
});

const US_PRICES = row('US', 'USD', 299, 149);

/** The founding price list. Changing a founding price breaks the lock: don't. */
export const FOUNDING_GROUP_PRICES: Record<string, GroupPriceList> = {
  KE: row('KE', 'KES', 29_900, 14_900, true),
  UG: row('UG', 'UGX', 840_000, 420_000, true),
  TZ: row('TZ', 'TZS', 600_000, 300_000, true),
  RW: row('RW', 'RWF', 300_000, 150_000, true),
  NG: row('NG', 'NGN', 350_000, 175_000, true),
  ZA: row('ZA', 'ZAR', 4_500, 2_200, true),
  GH: row('GH', 'GHS', 3_000, 1_500, true),
  // Second round, approved by the owner 20/11/26 (the pawaPay countries). Recorded
  // only: these countries have no Stawi country profile yet, so a group cannot be
  // set there and the quote falls back to Kenya. They open once each is added as a
  // market in compliance.ts (owner decision; compliance-pack).
  ZM: row('ZM', 'ZMW', 5_000, 2_500, true),
  MW: row('MW', 'MWK', 400_000, 200_000, true),
  MZ: row('MZ', 'MZN', 15_000, 7_500, true),
  CM: row('CM', 'XAF', 130_000, 65_000, true),
  CG: row('CG', 'XAF', 130_000, 65_000, true),
  GA: row('GA', 'XAF', 130_000, 65_000, true),
  CI: row('CI', 'XOF', 130_000, 65_000, true),
  SN: row('SN', 'XOF', 130_000, 65_000, true),
  BJ: row('BJ', 'XOF', 130_000, 65_000, true),
  BF: row('BF', 'XOF', 130_000, 65_000, true),
  CD: row('CD', 'CDF', 530_000, 270_000, true),
  LS: row('LS', 'LSL', 4_000, 2_000, true),
  SL: row('SL', 'SLE', 5_500, 2_700, true),
  ZW: row('ZW', 'USD', 299, 149, true),
  ET: row('ET', 'ETB', 38_000, 19_000, true),
  US: US_PRICES,
  GB: row('GB', 'GBP', 249, 119),
  DE: row('DE', 'EUR', 279, 139),
  IN: row('IN', 'INR', 19_900, 9_900),
  AU: row('AU', 'AUD', 449, 219),
  CA: row('CA', 'CAD', 399, 199),
  AE: row('AE', 'AED', 1_099, 549),
  BR: row('BR', 'BRL', 1_490, 740),
};

/** Per-member pricing, by country (owner-approved 20/11/26: Kenya). */
export interface PerMemberPrice {
  perMemberCents: number;
  floorCents: number;
  ceilingCents: number;
}

export const PER_MEMBER_PRICES: Record<string, { full: PerMemberPrice; meetingsOnly: PerMemberPrice }> = {
  KE: {
    full: { perMemberCents: 1_000, floorCents: 5_000, ceilingCents: 29_900 },
    meetingsOnly: { perMemberCents: 500, floorCents: 3_000, ceilingCents: 14_900 },
  },
};

/** members × price per member, never below the floor or above the ceiling. */
export function perMemberMonthlyCents(price: PerMemberPrice, members: number): number {
  const n = Number.isFinite(members) ? Math.max(0, Math.floor(members)) : 0;
  return Math.min(price.ceilingCents, Math.max(price.floorCents, n * price.perMemberCents));
}

export function isSmallGroup(members: number): boolean {
  return members <= SMALL_GROUP_MAX_MEMBERS;
}

/**
 * Optional later prices for groups that joined after the founding window:
 * STAWI_GROUP_PRICES="KE:34900/17900,NG:400000/200000" (monthly/small, cents).
 * Bad entries are ignored. Founding groups never see these.
 */
export function parsePriceOverrides(raw: string | undefined): Record<string, { monthlyCents: number; smallMonthlyCents: number }> {
  const out: Record<string, { monthlyCents: number; smallMonthlyCents: number }> = {};
  for (const part of (raw ?? '').split(',')) {
    const m = part.trim().match(/^([A-Z]{2}):(\d+)\/(\d+)$/);
    const [, code, a, b] = m ?? [];
    if (!code || !a || !b) continue;
    const monthly = Number(a);
    const small = Number(b);
    if (monthly > 0 && small > 0) out[code] = { monthlyCents: monthly, smallMonthlyCents: small };
  }
  return out;
}

/** End of the founding window (STAWI_FOUNDING_UNTIL, an ISO date). Unset = still open. */
export function foundingUntil(env: Record<string, string | undefined> = {}): Date | null {
  const raw = env.STAWI_FOUNDING_UNTIL?.trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

/** A group whose subscription started before the founding window closed is a founding group. */
export function isFoundingGroup(subscribedAt: Date | null | undefined, env: Record<string, string | undefined> = {}): boolean {
  const until = foundingUntil(env);
  if (!until) return true;
  return !!subscribedAt && subscribedAt.getTime() < until.getTime();
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

/** The founding price holds while the group stays subscribed; cancelling ends it. */
export function lockHolds(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'TRIAL' || status === 'ACTIVE' || status === 'PAST_DUE';
}

export interface GroupQuote {
  country: string;
  currency: string;
  period: BillingPeriod;
  small: boolean;
  /** Price per month for this group. */
  monthlyCents: number;
  /** Price of the chosen period (a month, or a year = 10 months). */
  amountCents: number;
  /** True when the founding price lock applies. */
  locked: boolean;
  approved: boolean;
  /** True when the price follows the number of members (per-member country). */
  perMember: boolean;
  /** True when the group uses meetings and minutes only (half price). */
  meetingsOnly: boolean;
}

/**
 * The price a group pays. `subscribedAt`/`status` describe the group's
 * subscription (none yet = a new group, which gets the founding price while the
 * window is open).
 */
export function quoteGroup(input: {
  country: string;
  members: number;
  period?: BillingPeriod;
  subscribedAt?: Date | null;
  status?: SubscriptionStatus | null;
  now?: Date;
  env?: Record<string, string | undefined>;
  /** The group uses meetings and minutes only (owner 20/11/26: half price). */
  meetingsOnly?: boolean;
}): GroupQuote {
  const env = input.env ?? {};
  const now = input.now ?? new Date();
  const period = input.period ?? 'MONTH';
  const code = getCountryProfile(input.country).code;
  const founding: GroupPriceList = FOUNDING_GROUP_PRICES[code] ?? US_PRICES;
  const small = isSmallGroup(input.members);

  const existing = input.subscribedAt != null && lockHolds(input.status);
  const isFounding = existing ? isFoundingGroup(input.subscribedAt, env) : isFoundingGroup(now, env);
  const override = isFounding ? undefined : parsePriceOverrides(env.STAWI_GROUP_PRICES)[code];
  const list = override ? { ...founding, ...override } : founding;

  // Per member where approved (a later override, for groups after the founding window, still wins).
  const perMember = !override ? PER_MEMBER_PRICES[code] : undefined;
  const meetingsOnly = !!input.meetingsOnly && !!perMember;
  const monthlyCents = perMember
    ? perMemberMonthlyCents(meetingsOnly ? perMember.meetingsOnly : perMember.full, input.members)
    : small ? list.smallMonthlyCents : list.monthlyCents;
  return {
    country: founding.country,
    currency: founding.currency,
    period,
    small,
    monthlyCents,
    amountCents: period === 'YEAR' ? monthlyCents * YEAR_PLAN_MONTHS_PAID : monthlyCents,
    locked: isFounding,
    approved: founding.approved,
    perMember: !!perMember,
    meetingsOnly,
  };
}

// ── The business books (owner-approved 20/11/26, Kenya) ──────────────────

export type BooksPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface BooksPriceList {
  currency: string;
  /** A small shop keeps the books free: up to this many sales a month, one person. */
  freeSalesPerMonth: number;
  dayCents: number;
  weekCents: number;
  monthCents: number;
  /** A year ahead = 10 months. */
  yearCents: number;
}

export const BOOKS_PRICES: Record<string, BooksPriceList> = {
  KE: { currency: 'KES', freeSalesPerMonth: 100, dayCents: 500, weekCents: 3_000, monthCents: 9_900, yearCents: 99_000 },
};

export interface BooksQuote {
  country: string;
  currency: string;
  period: BooksPeriod;
  /** Nothing to pay: a small shop within the free plan. */
  free: boolean;
  amountCents: number;
}

/**
 * The price of the full books for a business. `salesThisMonth` and `people`
 * decide whether the small-shop free plan covers it. A business owned by a
 * subscribed group has its first business's books included (`groupIncluded`).
 * Null where the books are not priced yet for the country.
 */
export function quoteBooks(input: {
  country: string;
  period?: BooksPeriod;
  salesThisMonth?: number;
  people?: number;
  groupIncluded?: boolean;
}): BooksQuote | null {
  const code = (input.country ?? '').trim().toUpperCase();
  const list = BOOKS_PRICES[code];
  if (!list) return null;
  const period = input.period ?? 'MONTH';
  const smallShop = (input.salesThisMonth ?? 0) <= list.freeSalesPerMonth && (input.people ?? 1) <= 1;
  const free = !!input.groupIncluded || smallShop;
  const amountCents = free ? 0 : period === 'DAY' ? list.dayCents : period === 'WEEK' ? list.weekCents : period === 'YEAR' ? list.yearCents : list.monthCents;
  return { country: code, currency: list.currency, period, free, amountCents };
}

/** What is due this month: nothing in the first (free) month, else the quote. */
export function groupAmountDueCents(monthsActive: number, quote: GroupQuote): number {
  if (monthsActive <= 1) return 0;
  return quote.amountCents;
}

/** "KES 299", "$2.99": whole units when the price is whole, else two decimals. */
export function formatPrice(cents: number, currency: string): string {
  const whole = cents % 100 === 0;
  const n = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  return `${currency} ${n}`;
}

/** One line for a pricing page: "KES 299 a month or KES 2,990 a year". */
export function priceLine(quote: GroupQuote): string {
  const month = formatPrice(quote.monthlyCents, quote.currency);
  const year = formatPrice(quote.monthlyCents * YEAR_PLAN_MONTHS_PAID, quote.currency);
  return `${month} a month or ${year} a year`;
}
