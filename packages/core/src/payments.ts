/**
 * Global payment-provider abstraction.
 *
 * One interface, many rails: pick the right provider per country, build a unified
 * checkout request, and normalize results. Concrete API calls live in the app
 * (lib/billing.ts) behind this contract — M-Pesa for Kenya, cards (Stripe) for
 * US/EU/UK, Flutterwave/Paystack for West & Southern Africa, etc.
 */

import type { CountryCode } from './compliance.js';
import { getPlan, type PlanTier } from './plans.js';

export type PaymentProvider = 'MPESA' | 'STRIPE' | 'FLUTTERWAVE' | 'PAYSTACK' | 'MANUAL';

export type PaymentMethod = 'mobile_money' | 'card' | 'bank' | 'manual';

/** Preferred provider order per country (first available wins). */
const PROVIDER_MAP: Partial<Record<CountryCode, PaymentProvider[]>> = {
  KE: ['MPESA', 'FLUTTERWAVE', 'STRIPE'],
  NG: ['PAYSTACK', 'FLUTTERWAVE', 'STRIPE'],
  GH: ['PAYSTACK', 'FLUTTERWAVE'],
  ZA: ['PAYSTACK', 'STRIPE'],
  US: ['STRIPE'],
  GB: ['STRIPE'],
  DE: ['STRIPE'],
  CA: ['STRIPE'],
  AU: ['STRIPE'],
  IN: ['STRIPE'],
  AE: ['STRIPE'],
  BR: ['STRIPE'],
};

/** The provider Stawi will use for a country (falls back to STRIPE, then MANUAL). */
export function recommendProvider(country: string): PaymentProvider {
  const list = PROVIDER_MAP[country as CountryCode];
  return list?.[0] ?? 'STRIPE';
}

/** Methods a provider supports (drives the checkout UI). */
export function methodsFor(provider: PaymentProvider): PaymentMethod[] {
  switch (provider) {
    case 'MPESA': return ['mobile_money'];
    case 'PAYSTACK': return ['card', 'bank', 'mobile_money'];
    case 'FLUTTERWAVE': return ['card', 'mobile_money', 'bank'];
    case 'STRIPE': return ['card'];
    default: return ['manual'];
  }
}

export interface CheckoutRequest {
  provider: PaymentProvider;
  /** Amount in minor units (cents) of `currency`. */
  amountCents: number;
  currency: string;
  country: CountryCode;
  description: string;
  customerRef: string; // tenant or group id
}

export type CheckoutStatus = 'initiated' | 'pending' | 'succeeded' | 'failed';

export interface CheckoutResult {
  provider: PaymentProvider;
  status: CheckoutStatus;
  /** Redirect URL for hosted checkout (e.g. Stripe Checkout). */
  /** Provider-side id (CheckoutRequestID, PaymentIntent id, tx ref…). */
  reference: string;
  amountCents: number;
  currency: string;
  url?: string;
}

/**
 * Build a checkout request for a subscription plan in a country.
 * The plan's base USD price is used as the charge amount (the app converts to the
 * local currency at the FX rate of record before calling the provider).
 */
export function buildSubscriptionCheckout(
  tier: PlanTier,
  country: CountryCode,
  currency: string,
  amountCentsInCurrency: number,
  customerRef: string,
): CheckoutRequest {
  const plan = getPlan(tier);
  return {
    provider: recommendProvider(country),
    amountCents: amountCentsInCurrency,
    currency,
    country,
    description: `Stawi ${plan.name} subscription`,
    customerRef,
  };
}
