import { WindowLimiter, OTP_LIMITS } from '@stawi/core';

/**
 * Server-side sign-in throttles (in memory, per app instance — Fly runs one
 * always-on machine; Supabase's own project-level SMS limits sit underneath).
 * Kept on globalThis so dev hot-reload does not reset them.
 */
interface Throttles {
  sendPhone: WindowLimiter;
  sendIp: WindowLimiter;
  verifyPhone: WindowLimiter;
  verifyIp: WindowLimiter;
  pinIp: WindowLimiter;
  /** When the current code for a phone was sent (deleted once used). */
  otpSentAt: Map<string, number>;
}

const g = globalThis as unknown as { __stawiThrottles?: Throttles };

export function throttles(): Throttles {
  g.__stawiThrottles ??= {
    sendPhone: new WindowLimiter(OTP_LIMITS.sendPerPhone),
    sendIp: new WindowLimiter(OTP_LIMITS.sendPerIp),
    verifyPhone: new WindowLimiter(OTP_LIMITS.verifyPerPhone),
    verifyIp: new WindowLimiter(OTP_LIMITS.verifyPerIp),
    pinIp: new WindowLimiter({ max: 30, windowMs: 15 * 60_000 }),
    otpSentAt: new Map(),
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
