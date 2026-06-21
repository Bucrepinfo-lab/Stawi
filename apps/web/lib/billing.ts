/**
 * Billing provider router (server-only). Picks the rail for a country and calls
 * the concrete integration. Stripe is fully wired via the REST API (no SDK
 * dependency) and goes live the moment STRIPE_SECRET_KEY is set; Paystack and
 * Flutterwave are stubs returning `pending` until their keys are added.
 */

import { recommendProvider, type CheckoutRequest, type CheckoutResult } from '@stawi/core';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** Create a Stripe Checkout Session (subscription mode, first month free). */
async function stripeCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const base = { provider: req.provider, amountCents: req.amountCents, currency: req.currency };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ...base, status: 'pending', reference: 'stripe_unconfigured' };

  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('success_url', `${APP_URL}/subscribe?status=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${APP_URL}/subscribe?status=cancel`);
  form.set('client_reference_id', req.customerRef);
  form.set('subscription_data[trial_period_days]', '30'); // first month free
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', req.currency.toLowerCase());
  form.set('line_items[0][price_data][unit_amount]', String(req.amountCents));
  form.set('line_items[0][price_data][recurring][interval]', 'month');
  form.set('line_items[0][price_data][product_data][name]', req.description);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
    cache: 'no-store',
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    return { ...base, status: 'failed', reference: json.error?.message ?? `stripe_${res.status}` };
  }
  return { ...base, status: 'initiated', reference: json.id, url: json.url };
}

export async function startCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const base = { provider: req.provider, amountCents: req.amountCents, currency: req.currency };
  switch (req.provider) {
    case 'STRIPE':
      return stripeCheckout(req);
    case 'PAYSTACK':
      return { ...base, status: process.env.PAYSTACK_SECRET_KEY ? 'initiated' : 'pending', reference: 'paystack_stub' };
    case 'FLUTTERWAVE':
      return { ...base, status: process.env.FLW_SECRET_KEY ? 'initiated' : 'pending', reference: 'flw_stub' };
    case 'MPESA':
      // Recurring mobile-money debit would reuse the Daraja STK flow.
      return { ...base, status: 'pending', reference: 'mpesa_stk_pending' };
    default:
      return { ...base, status: 'pending', reference: 'manual' };
  }
}

export { recommendProvider };
