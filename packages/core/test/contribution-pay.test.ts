import { describe, expect, it } from 'vitest';
import {
  CONTRIBUTION_QUICK_CENTS, checkContributionAmount, contributionPayOptions, contributionReference,
  contributionTooSoon, memberPayEnabled,
} from '../src/contribution-pay';

describe('a member pays the way their country pays', () => {
  it('Kenya leads with M-Pesa and never offers a card', () => {
    expect(contributionPayOptions({ country: 'KE', mpesaOn: true })).toEqual([{ way: 'MPESA', label: 'M-Pesa', currency: 'KES' }]);
    expect(contributionPayOptions({ country: 'ke', mpesaOn: false })).toEqual([]);
  });

  it('other countries use mobile money only when it is switched on', () => {
    expect(contributionPayOptions({ country: 'UG', mpesaOn: true })).toEqual([]);
    const ug = contributionPayOptions({ country: 'UG', mpesaOn: true, mobileMoneyOn: true });
    expect(ug.map((o) => [o.way, o.currency])).toEqual([['MOBILE_MONEY', 'UGX']]);
    expect(contributionPayOptions({ country: 'US', mpesaOn: true, mobileMoneyOn: true })).toEqual([]);
    expect(contributionPayOptions({ country: null, mpesaOn: true })).toEqual([]);
  });
});

describe('small amounts are welcome, mistakes are not', () => {
  it('accepts the small amounts groups really use', () => {
    for (const cents of CONTRIBUTION_QUICK_CENTS.KES!) expect(checkContributionAmount(cents).ok).toBe(true);
    expect(checkContributionAmount(2_000)).toEqual({ ok: true, amountCents: 2_000 });
    expect(checkContributionAmount(1_000).ok).toBe(true);
  });

  it('refuses cents, nothing, negatives, text and amounts outside the limits', () => {
    for (const bad of [0, -500, 1_050, 999, 1.5, Number.NaN, '2000', null, undefined, 25_000_100]) {
      expect(checkContributionAmount(bad as number).ok).toBe(false);
    }
    const tooBig = checkContributionAmount(30_000_000);
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.error.en).toContain('250,000');
  });
});

describe('guards', () => {
  it('a double tap cannot ask twice', () => {
    const now = new Date('2026-11-20T12:00:00Z');
    expect(contributionTooSoon(new Date('2026-11-20T11:59:30Z'), now)).toBe(true);
    expect(contributionTooSoon(new Date('2026-11-20T11:58:00Z'), now)).toBe(false);
    expect(contributionTooSoon(null, now)).toBe(false);
  });

  it('is off until the owner switches it on', () => {
    expect(memberPayEnabled({})).toBe(false);
    expect(memberPayEnabled({ MEMBER_PAY_ENABLED: 'yes' })).toBe(false);
    expect(memberPayEnabled({ MEMBER_PAY_ENABLED: ' TRUE ' })).toBe(true);
  });

  it('builds a short reference from the group name', () => {
    expect(contributionReference('Umoja Women Group')).toBe('UMOJAWOMENGR');
    expect(contributionReference('***')).toBe('STAWI');
  });
});
