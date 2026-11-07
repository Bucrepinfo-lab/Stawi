/**
 * Sign-in policy (owner standing rule, 07/11/26) — pure, testable.
 *
 * Phone number → 6-digit SMS one-time code on the first sign-in on a device →
 * 4-digit PIN for later sign-ins on that trusted device. New device, forgotten
 * PIN or 5 wrong PINs → a new SMS code. A typed phone number on its own never
 * reaches account or group data.
 */

// ───────────────────────────── SMS one-time codes ─────────────────────────────

/** Codes are valid for at most 5 minutes. */
export const OTP_TTL_MS = 5 * 60_000;

/** Has the code sent at `sentAtMs` expired? No record (never sent / already used) counts as expired. */
export function otpExpired(sentAtMs: number | undefined, nowMs: number): boolean {
  if (sentAtMs === undefined) return true;
  return nowMs - sentAtMs > OTP_TTL_MS || nowMs < sentAtMs;
}

export interface RateRule {
  max: number;
  windowMs: number;
}

/** Server-side limits for sending and checking codes, per phone number and per IP. */
export const OTP_LIMITS = {
  sendPerPhone: { max: 3, windowMs: 15 * 60_000 } as RateRule,
  sendPerIp: { max: 10, windowMs: 15 * 60_000 } as RateRule,
  /** At least this long between two codes to the same number. */
  resendGapMs: 60_000,
  verifyPerPhone: { max: 5, windowMs: 15 * 60_000 } as RateRule,
  verifyPerIp: { max: 20, windowMs: 15 * 60_000 } as RateRule,
};

/** Fixed-window counter. Injected clock so tests control time. */
export class WindowLimiter {
  private hits = new Map<string, { count: number; start: number }>();
  constructor(
    private readonly rule: RateRule,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Count one attempt for `key`; returns whether it is allowed. */
  hit(key: string): { allowed: boolean; retryAfterMs: number } {
    const t = this.now();
    const cur = this.hits.get(key);
    if (!cur || t - cur.start >= this.rule.windowMs) {
      this.hits.set(key, { count: 1, start: t });
      return { allowed: true, retryAfterMs: 0 };
    }
    cur.count += 1;
    if (cur.count > this.rule.max) return { allowed: false, retryAfterMs: cur.start + this.rule.windowMs - t };
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}

/** Is this a 6-digit one-time code? */
export function isOtpShape(code: string | null | undefined): boolean {
  return /^\d{6}$/.test((code ?? '').trim());
}

// ─────────────────────────── API access by phone number ───────────────────────

export interface VerifiedIdentity {
  userId: string;
  /** E.164 phone from the verified session — never from the request. */
  phone: string | null;
}

/**
 * Who may read group data through the JSON API? Only a caller with a verified
 * session. Outside production (local/demo with nothing configured) the API may
 * run open on seed data. A shared app key or a phone typed into the request is
 * never enough on its own.
 */
export function decideApiAccess(opts: {
  production: boolean;
  identity: VerifiedIdentity | null;
  authConfigured: boolean;
}): 'identity' | 'dev-open' | 'deny' {
  if (opts.identity) return 'identity';
  if (!opts.production && !opts.authConfigured) return 'dev-open';
  return 'deny';
}

const digits9 = (p: string) => p.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

/**
 * The phone whose groups may be listed: always the verified session's phone.
 * A different phone in the request is refused (null) — typing a number gets nothing.
 */
export function phoneForLookup(identity: VerifiedIdentity, requested?: string | null): string | null {
  if (!identity.phone) return null;
  if (requested && requested.trim() && digits9(requested) !== digits9(identity.phone)) return null;
  return identity.phone;
}
