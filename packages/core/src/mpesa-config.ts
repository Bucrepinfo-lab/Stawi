/**
 * M-Pesa Daraja environment resolution (pure — env passed in).
 *
 * One switch, `MPESA_ENV` = `sandbox` | `production`, picks the Daraja base URL.
 * Every credential (shortcode, passkey, consumer key/secret, callback URL) comes
 * from env — nothing sandbox-specific is hard-coded into production paths, and
 * production refuses Safaricom's public sandbox values outright.
 *
 * Collection only: Lipa na M-Pesa Online (STK Push) initiated by a treasurer.
 * There is no B2C / payout configuration here by design.
 */

export type DarajaEnvName = 'sandbox' | 'production';

export const DARAJA_BASE_URLS: Record<DarajaEnvName, string> = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

/** Safaricom's published sandbox test shortcode — never valid in production. */
export const DARAJA_SANDBOX_SHORTCODE = '174379';

export interface DarajaConfig {
  env: DarajaEnvName;
  baseUrl: string;
  shortcode: string;
  passkey: string;
  consumerKey: string;
  consumerSecret: string;
  /** Callback URL, with `?token=` appended when MPESA_CALLBACK_TOKEN is set. */
  callbackUrl: string;
  /** Optional shared token the callback route checks (MPESA_CALLBACK_TOKEN). */
  callbackToken?: string;
}

export type DarajaConfigResult = { ok: true; config: DarajaConfig } | { ok: false; error: string };

type Env = Record<string, string | undefined>;

/** Parse MPESA_ENV. Unset → sandbox; anything else unknown → error (no silent fallback). */
export function darajaEnvName(env: Env): DarajaEnvName | null {
  const v = (env.MPESA_ENV ?? '').trim().toLowerCase();
  if (v === '' || v === 'sandbox') return 'sandbox';
  if (v === 'production' || v === 'live') return 'production';
  return null;
}

export function resolveDarajaConfig(env: Env): DarajaConfigResult {
  const name = darajaEnvName(env);
  if (!name) return { ok: false, error: 'MPESA_ENV must be "sandbox" or "production".' };

  const required = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL'] as const;
  const missing = required.filter((k) => !(env[k] ?? '').trim());
  if (missing.length) return { ok: false, error: `M-Pesa is not configured (missing ${missing.join(', ')}).` };

  const shortcode = env.MPESA_SHORTCODE!.trim();
  const rawCallback = env.MPESA_CALLBACK_URL!.trim();
  const m = /^(https?):\/\/([^/:?#]+)(?::\d+)?(?:[/?#]|$)/i.exec(rawCallback);
  if (!m) return { ok: false, error: 'MPESA_CALLBACK_URL is not a valid URL.' };
  const protocol = m[1]!.toLowerCase();
  const hostname = m[2]!.toLowerCase();

  if (name === 'production') {
    if (shortcode === DARAJA_SANDBOX_SHORTCODE) {
      return { ok: false, error: 'Production M-Pesa cannot use the sandbox shortcode.' };
    }
    if (protocol !== 'https' || /^(localhost|127\.|0\.0\.0\.0)/.test(hostname)) {
      return { ok: false, error: 'Production M-Pesa needs a public https MPESA_CALLBACK_URL.' };
    }
  }

  const token = (env.MPESA_CALLBACK_TOKEN ?? '').trim() || undefined;
  let callbackUrl = rawCallback;
  if (token) callbackUrl += `${rawCallback.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

  return {
    ok: true,
    config: {
      env: name,
      baseUrl: DARAJA_BASE_URLS[name],
      shortcode,
      passkey: env.MPESA_PASSKEY!.trim(),
      consumerKey: env.MPESA_CONSUMER_KEY!.trim(),
      consumerSecret: env.MPESA_CONSUMER_SECRET!.trim(),
      callbackUrl,
      callbackToken: token,
    },
  };
}

/** Daraja wants yyyyMMddHHmmss in Kenyan time (EAT, UTC+3, no DST) — independent of the server's TZ. */
export function darajaTimestampEAT(d: Date = new Date()): string {
  const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${eat.getUTCFullYear()}` +
    p(eat.getUTCMonth() + 1) +
    p(eat.getUTCDate()) +
    p(eat.getUTCHours()) +
    p(eat.getUTCMinutes()) +
    p(eat.getUTCSeconds())
  );
}

/** Constant-time-ish comparison for the callback token (no early exit on first mismatch). */
export function callbackTokenMatches(expected: string | undefined, provided: string | null | undefined): boolean {
  if (!expected) return true; // token not configured → not enforced
  const a = expected;
  const b = provided ?? '';
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
