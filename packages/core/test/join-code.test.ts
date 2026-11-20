import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  JOIN_CODE_MAX_TRIES,
  JOIN_CODE_TTL_MS,
  checkJoinCode,
  cleanJoinCode,
  isJoinCodeShape,
  joinCodeMaterial,
  joinCodeMessage,
  joinCodeOpen,
  newJoinCode,
  phoneIsProven,
} from '../src/join-code';
import { isReviewPinLogin, reviewPhone } from '../src/review-access';

const hmac = (s: string) => createHmac('sha256', 'test-secret').update(s).digest('hex');
const now = new Date('2026-11-20T12:00:00Z');
const row = (over: Partial<{ id: string; groupId: string; code: string; tries: number; usedAt: Date | null; expiresAt: Date }> = {}) => {
  const groupId = over.groupId ?? 'g1';
  const code = over.code ?? '482913';
  return {
    id: over.id ?? 'r1',
    groupId,
    phoneKey: '712345678',
    codeHash: hmac(joinCodeMaterial(groupId, '712345678', code)),
    expiresAt: over.expiresAt ?? new Date(now.getTime() + JOIN_CODE_TTL_MS),
    usedAt: over.usedAt ?? null,
    tries: over.tries ?? 0,
  };
};

describe('joining codes (no SMS, owner 20/11/26)', () => {
  it('are 6 digits, never all zeros', () => {
    let n = 0;
    const seq = () => (n++ < 6 ? 0 : 7);
    expect(newJoinCode(seq)).toBe('777777');
    expect(isJoinCodeShape(newJoinCode((m) => (m - 1) % 10))).toBe(true);
  });

  it('accept what people type with spaces', () => {
    expect(cleanJoinCode(' 482 913 ')).toBe('482913');
    expect(isJoinCodeShape('48291')).toBe(false);
  });

  it('let the right code in for its group', () => {
    expect(checkJoinCode([row()], '482 913', now, hmac)).toMatchObject({ ok: true, groupId: 'g1', rowId: 'r1' });
  });

  it('do not work for another phone or group', () => {
    const other = { ...row(), phoneKey: '799999999' };
    expect(checkJoinCode([other], '482913', now, hmac).ok).toBe(false);
  });

  it('work once, expire after 48 hours and burn after 5 wrong tries', () => {
    expect(checkJoinCode([row({ usedAt: now })], '482913', now, hmac)).toMatchObject({ ok: false, reason: 'none' });
    expect(checkJoinCode([row({ expiresAt: now })], '482913', now, hmac)).toMatchObject({ ok: false, reason: 'none' });
    expect(checkJoinCode([row({ tries: JOIN_CODE_MAX_TRIES })], '482913', now, hmac)).toMatchObject({ ok: false, reason: 'none' });
    expect(checkJoinCode([row({ tries: JOIN_CODE_MAX_TRIES - 1 })], '000001', now, hmac)).toMatchObject({ ok: false, reason: 'wrong', burned: true, rowId: 'r1' });
    expect(checkJoinCode([row({ tries: 1 })], '000001', now, hmac)).toMatchObject({ ok: false, reason: 'wrong', burned: false });
    expect(joinCodeOpen(row(), now)).toBe(true);
  });

  it('message names the group and the code but carries no link to tap', () => {
    const m = joinCodeMessage({ name: 'Amina Wanjiru', groupName: 'Umoja', code: '482913', site: 'getstawi.com' });
    expect(m).toContain('Amina');
    expect(m).toContain('482913');
    expect(m).not.toMatch(/https?:/);
    expect(joinCodeMessage({ name: 'Amina', groupName: 'Umoja', code: '482913', site: 'getstawi.com', lang: 'sw' })).toContain('482913');
  });
});

describe('a phone is proven only by a joining code (or an older SMS code)', () => {
  it('reads the flag first, then the old SMS confirmation', () => {
    expect(phoneIsProven({ phone_proved: true }, null)).toBe(true);
    expect(phoneIsProven({ phone_proved: false }, '2026-11-01T00:00:00Z')).toBe(false);
    expect(phoneIsProven({}, '2026-11-01T00:00:00Z')).toBe(true);
    expect(phoneIsProven(null, null)).toBe(false);
  });
});

describe('Play reviewer signs in with phone + fixed PIN', () => {
  const env = { PLAY_REVIEW_PHONE: '0700 000 999', PLAY_REVIEW_PIN: '2580' };
  it('needs the number and the exact 4-digit PIN', () => {
    expect(reviewPhone(env)).toBe('+254700000999');
    expect(isReviewPinLogin(env, '0700000999', '2580')).toBe(true);
    expect(isReviewPinLogin(env, '0700000999', '2581')).toBe(false);
    expect(isReviewPinLogin(env, '0711111111', '2580')).toBe(false);
    expect(isReviewPinLogin({ PLAY_REVIEW_PHONE: '0700000999', PLAY_REVIEW_PIN: '25' }, '0700000999', '25')).toBe(false);
    expect(isReviewPinLogin({ PLAY_REVIEW_PIN: '2580' }, '0700000999', '2580')).toBe(false);
  });
});
