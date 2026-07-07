/**
 * Paystack HTTP client (server-only) — live-on-key.
 *
 * Used for card + bank collections in NG/GH/ZA (routed by
 * @stawi/core payments.recommendProvider). Without PAYSTACK_SECRET_KEY the
 * helpers return `configured: false` so callers can fall back gracefully.
 */

const BASE = 'https://api.paystack.co';

export const paystackEnabled = () => !!process.env.PAYSTACK_SECRET_KEY;

interface PsInitResponse {
  status: boolean;
  message: string;
  data?: { authorization_url: string; access_code: string; reference: string };
}

/**
 * Initialize a hosted checkout. Amount in the SMALLEST unit (kobo/pesewas/cents).
 * Returns the redirect URL the customer completes payment on.
 */
export async function paystackInitialize(input: {
  email: string;
  amountMinor: number;
  currency?: 'NGN' | 'GHS' | 'ZAR' | 'KES' | 'USD';
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}): Promise<{ configured: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  if (!paystackEnabled()) return { configured: false };
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency ?? 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
    cache: 'no-store',
  });
  const json = (await res.json()) as PsInitResponse;
  if (!res.ok || !json.status || !json.data) {
    return { configured: true, error: json.message || `Paystack HTTP ${res.status}` };
  }
  return { configured: true, authorizationUrl: json.data.authorization_url, reference: json.data.reference };
}

/** Verify a transaction after redirect/webhook. */
export async function paystackVerify(reference: string): Promise<{
  configured: boolean;
  succeeded?: boolean;
  amountMinor?: number;
  currency?: string;
  error?: string;
}> {
  if (!paystackEnabled()) return { configured: false };
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: 'no-store',
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { status: string; amount: number; currency: string };
  };
  if (!res.ok || !json.status || !json.data) {
    return { configured: true, error: json.message || `Paystack HTTP ${res.status}` };
  }
  return {
    configured: true,
    succeeded: json.data.status === 'success',
    amountMinor: json.data.amount,
    currency: json.data.currency,
  };
}
