import { describe, it, expect } from 'vitest';
import {
  quoteGroup,
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
  it('Kenya: KES 299 a month per group, KES 2,990 a year', () => {
    const m = quoteGroup({ country: 'KE', members: 25 });
    expect(m.currency).toBe('KES');
    expect(m.amountCents).toBe(29_900);
    const y = quoteGroup({ country: 'KE', members: 25, period: 'YEAR' });
    expect(y.amountCents).toBe(299_000);
    expect(YEAR_PLAN_MONTHS_PAID).toBe(10);
  });

  it('a group of 10 or fewer pays KES 149 (KES 1,490 a year)', () => {
    expect(isSmallGroup(10)).toBe(true);
    expect(isSmallGroup(11)).toBe(false);
    expect(quoteGroup({ country: 'KE', members: 10 }).amountCents).toBe(14_900);
    expect(quoteGroup({ country: 'KE', members: 10, period: 'YEAR' }).amountCents).toBe(149_000);
    expect(quoteGroup({ country: 'KE', members: 11 }).amountCents).toBe(29_900);
  });

  it('the first month is free', () => {
    const q = quoteGroup({ country: 'KE', members: 20 });
    expect(groupAmountDueCents(1, q)).toBe(0);
    expect(groupAmountDueCents(2, q)).toBe(29_900);
  });

  it('the African prices are owner-approved (20/11/26); the rest of the world is indicative', () => {
    const approved = ['KE', 'UG', 'TZ', 'RW', 'NG', 'ZA', 'GH'];
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
    expect(priceLine(quoteGroup({ country: 'KE', members: 4 }))).toBe('KES 149 a month or KES 1,490 a year');
  });
});
