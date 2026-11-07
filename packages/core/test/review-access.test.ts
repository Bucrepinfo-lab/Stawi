import { describe, it, expect } from 'vitest';
import { isReviewLogin, isReviewPhone, reviewPhone } from '../src/review-access';

const env = { PLAY_REVIEW_PHONE: '0700 000 999', PLAY_REVIEW_CODE: '424242' };

describe('Play reviewer access', () => {
  it('is off unless BOTH env values are set', () => {
    expect(reviewPhone({})).toBeNull();
    expect(reviewPhone({ PLAY_REVIEW_PHONE: '0700000999' })).toBeNull();
    expect(reviewPhone({ PLAY_REVIEW_CODE: '424242' })).toBeNull();
    expect(isReviewLogin({ PLAY_REVIEW_CODE: '424242' }, '+254700000999', '424242')).toBe(false);
    expect(isReviewLogin({ PLAY_REVIEW_PHONE: '0700000999' }, '+254700000999', '')).toBe(false);
  });

  it('matches the configured number in any local/E.164 spelling', () => {
    expect(reviewPhone(env)).toBe('+254700000999');
    expect(isReviewPhone(env, '+254700000999')).toBe(true);
    expect(isReviewPhone(env, '254700000999')).toBe(true);
    expect(isReviewPhone(env, '0700000999')).toBe(true);
    expect(isReviewPhone(env, '0700000998')).toBe(false);
  });

  it('requires the exact fixed code for that one number', () => {
    expect(isReviewLogin(env, '0700000999', '424242')).toBe(true);
    expect(isReviewLogin(env, '0700000999', '424243')).toBe(false);
    expect(isReviewLogin(env, '0700000999', '')).toBe(false);
    expect(isReviewLogin(env, '0711111111', '424242')).toBe(false);
  });
});
