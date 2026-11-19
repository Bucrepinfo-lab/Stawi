/**
 * Paddle card checkout (owner decision 19/11/26, all five products): for card
 * sales Paddle is the merchant of record. It is the seller, charges the tax
 * for the buyer's country, and files and remits it. M-Pesa stays a direct
 * sale with no VAT until the company is VAT-registered.
 *
 * Pure (browser-safe): no secrets leave the server and no crypto here. The
 * webhook passes its own HMAC function to verifyPaddleSignature.
 * Off unless PADDLE_ENABLED=true and every key is set (Fly secrets, owner only).
 */
export type PaddleEnv = Record<string, string | undefined>;

/** Stawi's four card prices: small group (10 or fewer) or group, by period. */
export const STAWI_PADDLE_PRICES = {
  SMALL_MONTH: 'PADDLE_PRICE_SMALL_MONTH',
  SMALL_YEAR: 'PADDLE_PRICE_SMALL_YEAR',
  GROUP_MONTH: 'PADDLE_PRICE_GROUP_MONTH',
  GROUP_YEAR: 'PADDLE_PRICE_GROUP_YEAR',
} as const;

export type StawiPaddleKey = keyof typeof STAWI_PADDLE_PRICES;

export interface PaddleConfig<K extends string> {
  environment: 'sandbox' | 'production';
  /** Public client-side token (Paddle.js). */
  clientToken: string;
  webhookSecret: string;
  prices: Record<K, string>;
}

export function paddleConfig<K extends string>(env: PaddleEnv, priceEnv: Record<K, string>): PaddleConfig<K> | null {
  if ((env.PADDLE_ENABLED ?? '').trim().toLowerCase() !== 'true') return null;
  const read = (key: string) => (env[key] ?? '').trim();
  const clientToken = read('PADDLE_CLIENT_TOKEN');
  const webhookSecret = read('PADDLE_WEBHOOK_SECRET');
  if (!clientToken || !webhookSecret) return null;
  const prices = {} as Record<K, string>;
  for (const key of Object.keys(priceEnv) as K[]) {
    const id = read(priceEnv[key]);
    if (!id) return null;
    prices[key] = id;
  }
  const environment = read('PADDLE_ENV').toLowerCase() === 'production' ? 'production' : 'sandbox';
  return { environment, clientToken, webhookSecret, prices };
}

export function stawiPaddleKey(smallGroup: boolean, period: 'MONTH' | 'YEAR'): StawiPaddleKey {
  return `${smallGroup ? 'SMALL' : 'GROUP'}_${period}`;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Check a Paddle-Signature header ("ts=<unix>;h1=<hex>[;h1=<hex>]"): HMAC-SHA256
 * of "<ts>:<raw body>" with the notification secret, within 5 minutes.
 * `hmacSha256Hex(secret, data)` is supplied by the server (node:crypto).
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  hmacSha256Hex: (secret: string, data: string) => string,
  nowMs: number = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!header || !secret) return false;
  let ts = '';
  const sigs: string[] = [];
  for (const part of header.split(';')) {
    const [key, value] = part.split('=', 2).map((piece) => piece?.trim() ?? '');
    if (key === 'ts') ts = value ?? '';
    else if (key === 'h1' && value) sigs.push(value.toLowerCase());
  }
  const tsNum = Number(ts);
  if (!ts || !Number.isFinite(tsNum) || sigs.length === 0) return false;
  if (Math.abs(nowMs / 1000 - tsNum) > toleranceSec) return false;
  const expected = hmacSha256Hex(secret, `${ts}:${rawBody}`).toLowerCase();
  return sigs.some((sig) => constantTimeEqualHex(sig, expected));
}

export interface PaddlePaidItem<K extends string> {
  transactionId: string;
  key: K;
  /** Our id from custom_data[customKey]. */
  customId: string;
  /** Grand total in currency units (Paddle sends minor units), or null. */
  amount: number | null;
  currency: string | null;
}

/** A paid item from a Paddle notification, or null for anything that isn't ours and completed. */
export function paidItemFromPaddleEvent<K extends string>(
  event: unknown,
  prices: Record<K, string>,
  customKey: string,
): PaddlePaidItem<K> | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as { event_type?: unknown; data?: Record<string, unknown> };
  if (e.event_type !== 'transaction.completed' || !e.data) return null;
  const d = e.data as {
    id?: unknown;
    status?: unknown;
    custom_data?: Record<string, unknown> | null;
    items?: Array<{ price?: { id?: unknown } | null; price_id?: unknown } | null>;
    currency_code?: unknown;
    details?: { totals?: { grand_total?: unknown } | null } | null;
  };
  if (typeof d.id !== 'string' || !d.id) return null;
  if (d.status !== 'completed' && d.status !== 'paid') return null;
  const customId = d.custom_data?.[customKey];
  if (typeof customId !== 'string' || !customId) return null;

  const byPrice = new Map<string, K>();
  for (const key of Object.keys(prices) as K[]) byPrice.set(prices[key], key);
  const key = (d.items ?? [])
    .map((item) =>
      typeof item?.price?.id === 'string' ? item.price.id : typeof item?.price_id === 'string' ? item.price_id : '',
    )
    .map((id) => byPrice.get(id))
    .find((found): found is K => found !== undefined);
  if (!key) return null;

  const total = d.details?.totals?.grand_total;
  const minor = typeof total === 'string' || typeof total === 'number' ? Number(total) : Number.NaN;
  return {
    transactionId: d.id,
    key,
    customId,
    amount: Number.isFinite(minor) ? minor / 100 : null,
    currency: typeof d.currency_code === 'string' ? d.currency_code : null,
  };
}
