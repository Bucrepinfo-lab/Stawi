import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import {
  pinProblem,
  afterPinAttempt,
  pinLocked,
  PIN_MAX_ATTEMPTS,
  makeDeviceToken,
  verifyDeviceToken,
  maskPhone,
  type DeviceRow,
} from '../src/pin-policy';

const c = {
  hmac: (s: string) => createHmac('sha256', 'test-secret').update(s).digest('hex'),
  sha256: (s: string) => createHash('sha256').update(s).digest('hex'),
};

describe('PIN choice', () => {
  it('needs exactly 4 digits and rejects trivial PINs', () => {
    expect(pinProblem('4829')).toBeNull();
    expect(pinProblem('482')).not.toBeNull();
    expect(pinProblem('48a9')).not.toBeNull();
    expect(pinProblem('0000')).not.toBeNull();
    expect(pinProblem('1234')).not.toBeNull();
    expect(pinProblem('9876')).not.toBeNull();
  });
});

describe('PIN lockout after 5 wrong tries', () => {
  it('counts down and locks on the 5th wrong PIN', () => {
    let s = { failedCount: 0, lockedAt: null as Date | null };
    const now = new Date('2026-11-07T10:00:00Z');
    for (let i = 1; i <= 4; i++) {
      const r = afterPinAttempt(s, false, now);
      expect(r.locked).toBe(false);
      expect(r.attemptsLeft).toBe(PIN_MAX_ATTEMPTS - i);
      s = r;
    }
    const fifth = afterPinAttempt(s, false, now);
    expect(fifth.locked).toBe(true);
    expect(fifth.lockedAt).toEqual(now);
    expect(pinLocked(fifth)).toBe(true);
  });

  it('stays locked even for the right PIN — only a new SMS code unlocks', () => {
    const locked = { failedCount: 5, lockedAt: new Date() };
    const r = afterPinAttempt(locked, true, new Date());
    expect(r.locked).toBe(true);
    expect(r.attemptsLeft).toBe(0);
  });

  it('a correct PIN before lockout clears the counter', () => {
    const r = afterPinAttempt({ failedCount: 3, lockedAt: null }, true, new Date());
    expect(r).toMatchObject({ failedCount: 0, locked: false });
  });
});

describe('trusted-device token', () => {
  const secret = 'Zm9vYmFyYmF6';
  const row: DeviceRow = { id: 'dev1', userId: 'user-1', tokenHash: c.sha256(secret), revokedAt: null };
  const token = makeDeviceToken('dev1', secret, 'user-1', c);

  it('verifies a genuine token for its own user', () => {
    expect(verifyDeviceToken(token, row, c)).toBe('user-1');
  });

  it('is refused once revoked (sign out of all devices)', () => {
    expect(verifyDeviceToken(token, { ...row, revokedAt: new Date() }, c)).toBeNull();
  });

  it('is refused if tampered, unknown, or bound to another user', () => {
    expect(verifyDeviceToken(token.replace(/.$/, (x) => (x === 'a' ? 'b' : 'a')), row, c)).toBeNull();
    expect(verifyDeviceToken(token, null, c)).toBeNull();
    expect(verifyDeviceToken(token, { ...row, userId: 'someone-else' }, c)).toBeNull();
    expect(verifyDeviceToken('garbage', row, c)).toBeNull();
    expect(verifyDeviceToken(makeDeviceToken('dev1', 'other', 'user-1', c), row, c)).toBeNull();
  });

  it('masks the phone on the PIN screen', () => {
    expect(maskPhone('+254712345678')).toBe('07•• ••• 678');
  });
});
