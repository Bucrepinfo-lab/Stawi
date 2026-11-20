import { describe, it, expect } from 'vitest';
import {
  quoteGroup,
  quoteBooks,
  groupAmountDueCents,
  isSmallGroup,
  isFoundingGroup,
  lockHolds,
  parsePriceOverrides,
  formatPrice,
  priceLine,
  FOUNDING_GROUP_PRICES,
  YEAR_PLAN_MONTHS_PAID,
} from '../src/group-pricing';

const launch = { STAWI_FOUNDING_UNTIL: '2027-12-01' };
const later = { ...launch, STAWI_GROUP_PRICES: 'KE:34900/17900' };

describe('group pricing (owner decision 18/11/26)', () => {
  it('Kenya: a group of 30 or more pays the KES 299 ceiling, KES 2,990 a year (owner 20/11/26)', () => {
    const m = quoteGroup({ country: 'KE', members: 30 });
    expect(m.currency).toBe('KES');
    expect(m.amountCents).toBe(29_900);
    const y = quoteGroup({ country: 'KE', members: 30, period: 'YEAR' });
    expect(y.amountCents).toBe(299_000);
    expect(YEAR_PLAN_MONTHS_PAID).toBe(10);
  });

  it('Kenya is priced per member (owner 20/11/26): KES 10 a member, at least 50, at most 299', () => {
    expect(isSmallGroup(10)).toBe(true);
    expect(isSmallGroup(11)).toBe(false);
    const k = (members: number, period?: 'MONTH' | 'YEAR') => quoteGroup({ country: 'KE', members, period }).amountCents;
    expect([1, 5, 6, 10, 11, 15, 29, 30, 60, 500].map((n) => k(n))).toEqual([5_000, 5_000, 6_000, 10_000, 11_000, 15_000, 29_000, 29_900, 29_900, 29_900]);
    expect(k(10, 'YEAR')).toBe(100_000);
    expect(k(30, 'YEAR')).toBe(299_000);
    expect(quoteGroup({ country: 'KE', members: 12 })).toMatchObject({ perMember: true, meetingsOnly: false, approved: true });
  });

  it('a group using meetings and minutes only pays half: KES 5 a member, 30 to 149', () => {
    const k = (members: number) => quoteGroup({ country: 'KE', members, meetingsOnly: true }).amountCents;
    expect([1, 6, 10, 20, 30, 40].map(k)).toEqual([3_000, 3_000, 5_000, 10_000, 14_900, 14_900]);
    expect(quoteGroup({ country: 'KE', members: 10, meetingsOnly: true }).meetingsOnly).toBe(true);
    // Countries not yet on per-member pricing ignore it.
    expect(quoteGroup({ country: 'UG', members: 30, meetingsOnly: true })).toMatchObject({ perMember: false, meetingsOnly: false, monthlyCents: 840_000 });
  });

  it('nobody in Kenya pays more than the price approved on 18/11/26', () => {
    for (let n = 0; n <= 200; n++) {
      expect(quoteGroup({ country: 'KE', members: n }).monthlyCents).toBeLessThanOrEqual(29_900);
    }
  });

  it('the first month is free', () => {
    const q = quoteGroup({ country: 'KE', members: 20 });
    expect(groupAmountDueCents(1, q)).toBe(0);
    expect(groupAmountDueCents(2, q)).toBe(q.amountCents);
  });

  it('the African prices are owner-approved (20/11/26); the rest of the world is indicative', () => {
    const approved = ['KE', 'UG', 'TZ', 'RW', 'NG', 'ZA', 'GH',
      'ZM', 'MW', 'MZ', 'CM', 'CG', 'GA', 'CI', 'SN', 'BJ', 'BF', 'CD', 'LS', 'SL', 'ZW', 'ET'];
    for (const [code, row] of Object.entries(FOUNDING_GROUP_PRICES)) {
      expect(row.approved).toBe(approved.includes(code));
      expect(row.smallMonthlyCents).toBeGreaterThan(0);
      expect(row.monthlyCents).toBeGreaterThan(row.smallMonthlyCents);
    }
    expect(quoteGroup({ country: 'NG', members: 30 }).approved).toBe(true);
    expect(quoteGroup({ country: 'GB', members: 30 }).approved).toBe(false);
  });

  it('Uganda, Tanzania and Rwanda quote in their own currency', () => {
    expect(quoteGroup({ country: 'UG', members: 30 })).toMatchObject({ currency: 'UGX', monthlyCents: 840_000, approved: true });
    expect(quoteGroup({ country: 'TZ', members: 8 })).toMatchObject({ currency: 'TZS', monthlyCents: 300_000, small: true });
    expect(quoteGroup({ country: 'RW', members: 30, period: 'YEAR' })).toMatchObject({ currency: 'RWF', amountCents: 3_000_000 });
  });

  it('a group joining in the founding window keeps the founding price while subscribed', () => {
    const joined = new Date('2027-03-01');
    const q = quoteGroup({ country: 'KE', members: 30, subscribedAt: joined, status: 'ACTIVE', now: new Date('2029-01-01'), env: later });
    expect(q.locked).toBe(true);
    expect(q.amountCents).toBe(29_900);
  });

  it('cancelling ends the lock; rejoining after the window pays the later price', () => {
    expect(lockHolds('CANCELLED')).toBe(false);
    expect(lockHolds('PAST_DUE')).toBe(true);
    const q = quoteGroup({ country: 'KE', members: 30, subscribedAt: new Date('2027-03-01'), status: 'CANCELLED', now: new Date('2029-01-01'), env: later });
    expect(q.locked).toBe(false);
    expect(q.amountCents).toBe(34_900);
  });

  it('a group joining after the window pays the later price', () => {
    const q = quoteGroup({ country: 'KE', members: 5, now: new Date('2028-01-01'), env: later });
    expect(q.locked).toBe(false);
    expect(q.amountCents).toBe(17_900);
  });

  it('with no window end set, every group is a founding group', () => {
    expect(isFoundingGroup(new Date('2030-01-01'), {})).toBe(true);
    expect(quoteGroup({ country: 'KE', members: 30, env: { STAWI_GROUP_PRICES: 'KE:34900/17900' } }).amountCents).toBe(29_900);
  });

  it('ignores bad override entries', () => {
    expect(parsePriceOverrides('KE:0/100,XX,NG:5/abc')).toEqual({});
    expect(parsePriceOverrides('KE:34900/17900')).toEqual({ KE: { monthlyCents: 34_900, smallMonthlyCents: 17_900 } });
  });

  it('formats prices for people', () => {
    expect(formatPrice(29_900, 'KES')).toBe('KES 299');
    expect(formatPrice(299_000, 'KES')).toBe('KES 2,990');
    expect(formatPrice(299, 'USD')).toBe('USD 2.99');
    expect(priceLine(quoteGroup({ country: 'KE', members: 4 }))).toBe('KES 50 a month or KES 500 a year');
    expect(priceLine(quoteGroup({ country: 'KE', members: 30 }))).toBe('KES 299 a month or KES 2,990 a year');
  });
});

describe('the business books (owner 20/11/26, Kenya)', () => {
  it('a small shop keeps the books free; the full books are KES 99 a month, 30 a week, 5 a day', () => {
    expect(quoteBooks({ country: 'KE', salesThisMonth: 80 })).toMatchObject({ free: true, amountCents: 0, currency: 'KES' });
    expect(quoteBooks({ country: 'KE', salesThisMonth: 100, people: 1 })!.free).toBe(true);
    expect(quoteBooks({ country: 'KE', salesThisMonth: 101 })).toMatchObject({ free: false, amountCents: 9_900 });
    expect(quoteBooks({ country: 'KE', salesThisMonth: 10, people: 2 })!.free).toBe(false);
    expect(quoteBooks({ country: 'KE', salesThisMonth: 500, period: 'WEEK' })!.amountCents).toBe(3_000);
    expect(quoteBooks({ country: 'KE', salesThisMonth: 500, period: 'DAY' })!.amountCents).toBe(500);
    expect(quoteBooks({ country: 'KE', salesThisMonth: 500, period: 'YEAR' })!.amountCents).toBe(99_000);
    expect(quoteBooks({ country: 'KE', salesThisMonth: 500, groupIncluded: true })!.free).toBe(true);
  });

  it('is not priced outside Kenya yet', () => {
    expect(quoteBooks({ country: 'UG' })).toBeNull();
  });
});
