import { describe, it, expect } from 'vitest';
import {
  otpExpired,
  OTP_TTL_MS,
  WindowLimiter,
  isOtpShape,
  decideApiAccess,
  phoneForLookup,
} from '../src/auth-policy';

describe('SMS code expiry (≤ 5 minutes, single use)', () => {
  const sent = 1_000_000;
  it('is valid inside 5 minutes and expired after', () => {
    expect(OTP_TTL_MS).toBe(300_000);
    expect(otpExpired(sent, sent + 299_000)).toBe(false);
    expect(otpExpired(sent, sent + 300_001)).toBe(true);
  });
  it('treats a missing record (never sent, or already used) as expired', () => {
    expect(otpExpired(undefined, sent)).toBe(true);
  });
  it('accepts only 6-digit codes', () => {
    expect(isOtpShape('123456')).toBe(true);
    expect(isOtpShape('12345')).toBe(false);
    expect(isOtpShape('12a456')).toBe(false);
  });
});

describe('rate limits per number and per IP', () => {
  it('blocks after max hits in the window and recovers after it', () => {
    let t = 0;
    const lim = new WindowLimiter({ max: 3, windowMs: 1000 }, () => t);
    expect(lim.hit('+254700000001').allowed).toBe(true);
    expect(lim.hit('+254700000001').allowed).toBe(true);
    expect(lim.hit('+254700000001').allowed).toBe(true);
    const blocked = lim.hit('+254700000001');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(lim.hit('+254700000002').allowed).toBe(true); // other keys unaffected
    t = 1000;
    expect(lim.hit('+254700000001').allowed).toBe(true);
  });
});

describe('a typed phone number alone gets nothing', () => {
  it('denies the API in production without a verified session, even with a shared app key', () => {
    expect(decideApiAccess({ production: true, identity: null, authConfigured: true })).toBe('deny');
    expect(decideApiAccess({ production: true, identity: null, authConfigured: false })).toBe('deny');
  });
  it('only runs open outside production with no auth configured (seed demo)', () => {
    expect(decideApiAccess({ production: false, identity: null, authConfigured: false })).toBe('dev-open');
    expect(decideApiAccess({ production: false, identity: null, authConfigured: true })).toBe('deny');
  });
  it('lists groups only for the verified phone, never a phone from the request', () => {
    const me = { userId: 'u1', phone: '+254700000001' };
    expect(phoneForLookup(me)).toBe('+254700000001');
    expect(phoneForLookup(me, '0700000001')).toBe('+254700000001');
    expect(phoneForLookup(me, '0711111111')).toBeNull();
    expect(phoneForLookup({ userId: 'u2', phone: null }, '0700000001')).toBeNull();
  });
});
