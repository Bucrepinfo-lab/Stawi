/**
 * M-Pesa Daraja HTTP client (server-only).
 *
 * Treasurer-initiated collection only (Lipa na M-Pesa Online / STK Push). There
 * is no B2C, payout or refund call in this codebase by design.
 *
 * Environment: `MPESA_ENV` = `sandbox` | `production` picks the Daraja base URL;
 * shortcode, passkey, consumer key/secret and callback URL all come from env
 * (resolved + validated by @stawi/core `resolveDarajaConfig`). Production refuses
 * the public sandbox shortcode and non-https callbacks.
 */

import {
  buildStkPushPayload,
  darajaTimestampEAT,
  resolveDarajaConfig,
  type DarajaConfig,
  type StkPushParams,
} from '@stawi/core';

const toBase64 = (s: string) => Buffer.from(s).toString('base64');

/** Thrown when M-Pesa is not (correctly) configured for this environment. */
export class MpesaConfigError extends Error {}

/** Resolve the Daraja config for this deployment, or throw MpesaConfigError. */
export function darajaConfig(): DarajaConfig {
  const r = resolveDarajaConfig(process.env);
  if (!r.ok) throw new MpesaConfigError(r.error);
  return r.config;
}

/** OAuth: exchange consumer key/secret for a short-lived access token. */
export async function getAccessToken(cfg: DarajaConfig = darajaConfig()): Promise<string> {
  const auth = toBase64(`${cfg.consumerKey}:${cfg.consumerSecret}`);
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
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

/** Trigger an STK Push — the customer gets a PIN prompt and must approve it themselves. */
export async function initiateStkPush(args: InitiateStkArgs): Promise<StkInitiateResponse> {
  const cfg = darajaConfig();
  const token = await getAccessToken(cfg);
  const params: StkPushParams = {
    shortcode: cfg.shortcode,
    passkey: cfg.passkey,
    callbackUrl: cfg.callbackUrl,
    timestamp: darajaTimestampEAT(),
    encodeBase64: toBase64,
    ...args,
  };
  const payload = buildStkPushPayload(params);

  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
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
