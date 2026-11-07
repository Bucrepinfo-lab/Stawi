/**
 * Google Play reviewer access — pure checks (env passed in).
 *
 * Only when BOTH `PLAY_REVIEW_PHONE` and `PLAY_REVIEW_CODE` are set may that one
 * phone number sign in with that fixed code (no SMS). Unset → feature off.
 * Nothing about the reviewer is hard-coded; remove the env pair after review.
 */
import { toE164 } from './phone';

type Env = Record<string, string | undefined>;

/** The configured reviewer phone (E.164) when the feature is fully configured, else null. */
export function reviewPhone(env: Env): string | null {
  const phone = (env.PLAY_REVIEW_PHONE ?? '').trim();
  const code = (env.PLAY_REVIEW_CODE ?? '').trim();
  if (!phone || !code) return null;
  return toE164(phone);
}

/** Is `phone` the reviewer number (and the feature configured)? */
export function isReviewPhone(env: Env, phone: string | null | undefined): boolean {
  const target = reviewPhone(env);
  if (!target || !phone) return false;
  return toE164(phone) === target;
}

/** Equal-time string comparison (no early exit). */
function sameString(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Reviewer phone AND the fixed code both match. */
export function isReviewLogin(env: Env, phone: string | null | undefined, code: string | null | undefined): boolean {
  const expected = (env.PLAY_REVIEW_CODE ?? '').trim();
  const phoneOk = isReviewPhone(env, phone);
  const codeOk = sameString(expected, (code ?? '').trim());
  return phoneOk && codeOk && expected.length > 0;
}
