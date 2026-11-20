import { WindowLimiter, OTP_LIMITS } from '@stawi/core';

/**
 * Server-side sign-in throttles (in memory, per app instance — Fly runs one
 * always-on machine). Kept on globalThis so dev hot-reload does not reset them.
 * No SMS is sent to sign in (owner 20/11/26): these guard PIN and joining-code
 * guesses per phone number and per IP.
 */
interface Throttles {
  /** Joining-code tries. */
  verifyPhone: WindowLimiter;
  verifyIp: WindowLimiter;
  /** PIN tries (the PIN row itself locks after 5 wrong). */
  pinPhone: WindowLimiter;
  pinIp: WindowLimiter;
  /** New accounts opened from one IP. */
  startIp: WindowLimiter;
}

const g = globalThis as unknown as { __stawiThrottles?: Throttles };

export function throttles(): Throttles {
  g.__stawiThrottles ??= {
    verifyPhone: new WindowLimiter(OTP_LIMITS.verifyPerPhone),
    verifyIp: new WindowLimiter(OTP_LIMITS.verifyPerIp),
    pinPhone: new WindowLimiter({ max: 10, windowMs: 15 * 60_000 }),
    pinIp: new WindowLimiter({ max: 30, windowMs: 15 * 60_000 }),
    startIp: new WindowLimiter({ max: 5, windowMs: 60 * 60_000 }),
  };
  return g.__stawiThrottles;
}

/** Client IP as seen through Fly's proxy. */
export function clientIp(req: Request): string {
  return (
    req.headers.get('fly-client-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
