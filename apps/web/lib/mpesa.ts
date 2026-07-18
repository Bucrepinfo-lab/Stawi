/**
 * M-Pesa Daraja HTTP client (server-only).
 *
 * Wraps Safaricom's OAuth + STK Push endpoints. Pure payload/parse logic lives
 * in @stawi/core; this file only does the network calls and reads env.
 */

import { buildStkPushPayload, type StkPushParams } from '@stawi/core';

const BASE =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const toBase64 = (s: string) => Buffer.from(s).toString('base64');

/** OAuth: exchange consumer key/secret for a short-lived access token. */
export async function getAccessToken(): Promise<string> {
  const auth = toBase64(`${env('MPESA_CONSUMER_KEY')}:${env('MPESA_CONSUMER_SECRET')}`);
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Daraja OAuth: no access_token');
  return json.access_token;
}

export interface InitiateStkArgs {
  amountCents: number;
  payerPhone: string;
  accountReference: string;
  description: string;
}

export interface StkInitiateResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/** Trigger an STK Push — the customer gets a PIN prompt on their phone. */
export async function initiateStkPush(
  args: InitiateStkArgs,
): Promise<StkInitiateResponse> {
  const token = await getAccessToken();
  const params: StkPushParams = {
    shortcode: env('MPESA_SHORTCODE'),
    passkey: env('MPESA_PASSKEY'),
    callbackUrl: env('MPESA_CALLBACK_URL'),
    encodeBase64: toBase64,
    ...args,
  };
  const payload = buildStkPushPayload(params);

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const json = (await res.json()) as StkInitiateResponse & { errorMessage?: string };
  if (!res.ok || json.errorMessage) {
    throw new Error(`STK Push failed: ${json.errorMessage ?? res.status}`);
  }
  return json;
}
