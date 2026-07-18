/**
 * Flutterwave HTTP client (server-only) — live-on-key.
 *
 * Pan-African card + mobile-money collections (routed by
 * @stawi/core payments.recommendProvider). Without FLW_SECRET_KEY the
 * helpers return `configured: false` so callers can fall back gracefully.
 */

const BASE = 'https://api.flutterwave.com/v3';

const KEY = () => process.env.FLW_SECRET_KEY ?? process.env.FLUTTERWAVE_SECRET_KEY;

export const flutterwaveEnabled = () => !!KEY();

/**
 * Create a hosted payment link. Amount in MAJOR units (FLW convention).
 * Returns the redirect URL the customer completes payment on.
 */
export async function flutterwaveInitialize(input: {
  txRef: string;
  amountMajor: number;
  currency: string; // e.g. 'KES', 'NGN', 'UGX', 'GHS', 'USD'
  redirectUrl: string;
  customerEmail: string;
  customerName?: string;
  title?: string;
}): Promise<{ configured: boolean; paymentLink?: string; error?: string }> {
  if (!flutterwaveEnabled()) return { configured: false };
  const res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amountMajor,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: { email: input.customerEmail, name: input.customerName },
      customizations: { title: input.title ?? 'Stawi' },
    }),
    cache: 'no-store',
  });
  const json = (await res.json()) as {
    status: string;
    message: string;
    data?: { link: string };
  };
  if (!res.ok || json.status !== 'success' || !json.data) {
    return { configured: true, error: json.message || `Flutterwave HTTP ${res.status}` };
  }
  return { configured: true, paymentLink: json.data.link };
}

/** Verify a transaction by tx_ref after redirect/webhook. */
export async function flutterwaveVerify(txRef: string): Promise<{
  configured: boolean;
  succeeded?: boolean;
  amountMajor?: number;
  currency?: string;
  error?: string;
}> {
  if (!flutterwaveEnabled()) return { configured: false };
  const res = await fetch(
    `${BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${KEY()}` }, cache: 'no-store' },
  );
  const json = (await res.json()) as {
    status: string;
    message: string;
    data?: { status: string; amount: number; currency: string };
  };
  if (!res.ok || json.status !== 'success' || !json.data) {
    return { configured: true, error: json.message || `Flutterwave HTTP ${res.status}` };
  }
  return {
    configured: true,
    succeeded: json.data.status === 'successful',
    amountMajor: json.data.amount,
    currency: json.data.currency,
  };
}
