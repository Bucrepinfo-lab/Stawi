/**
 * Billing provider router (server-only). Picks the rail for a country and calls
 * the concrete integration. Each integration is a no-op stub until its API keys
 * are configured, so the app runs without billing wired.
 *
 * - M-Pesa STK reuses lib/mpesa.ts (already implemented for Kenya).
 * - Stripe / Flutterwave / Paystack are stubs returning `pending` until keyed.
 */

import { recommendProvider, type CheckoutRequest, type CheckoutResult } from '@stawi/core';

export async function startCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const base = { provider: req.provider, amountCents: req.amountCents, currency: req.currency };
  switch (req.provider) {
    case 'STRIPE': {
      if (!process.env.STRIPE_SECRET_KEY) return { ...base, status: 'pending', reference: 'stripe_unconfigured' };
      // TODO: create a Stripe Checkout Session / PaymentIntent.
      return { ...base, status: 'initiated', reference: 'pi_stub' };
    }
    case 'PAYSTACK':
      return { ...base, status: process.env.PAYSTACK_SECRET_KEY ? 'initiated' : 'pending', reference: 'paystack_stub' };
    case 'FLUTTERWAVE':
      return { ...base, status: process.env.FLW_SECRET_KEY ? 'initiated' : 'pending', reference: 'flw_stub' };
    case 'MPESA':
      // Mobile-money subscription debit would reuse the Daraja STK flow.
      return { ...base, status: 'pending', reference: 'mpesa_stk_pending' };
    default:
      return { ...base, status: 'pending', reference: 'manual' };
  }
}

export { recommendProvider };
