/**
 * A member pays their own contribution from their own phone (owner 20/11/26).
 *
 * The member taps Pay, chooses an amount, and the payment prompt arrives on
 * their phone. They approve it themselves with their own PIN — Stawi never
 * moves money for anyone (standing rule 6).
 *
 * The way most people in the country pay comes first (standing rule 17):
 * M-Pesa in Kenya, mobile money elsewhere. A card is NOT offered for
 * contributions: card payments go through the merchant of record, which sells
 * Stawi's subscription and may not collect a group's savings.
 *
 * Pure: no I/O. Money is integer minor units (cents).
 */

import { localMethodFor } from './payment-rails';

export type ContributionWay = 'MPESA' | 'MOBILE_MONEY';

export interface ContributionPayOption {
  way: ContributionWay;
  /** What the member sees, e.g. "M-Pesa". */
  label: string;
  currency: string;
}

/** Small amounts are the point: a member may put in as little as this. */
export const CONTRIBUTION_MIN_CENTS: Readonly<Record<string, number>> = { KES: 1_000 };
/** One M-Pesa payment cannot be more than KES 250,000 (Safaricom limit). */
export const CONTRIBUTION_MAX_CENTS: Readonly<Record<string, number>> = { KES: 25_000_000 };
/** Amounts people really put in: daily and weekly savers first. */
export const CONTRIBUTION_QUICK_CENTS: Readonly<Record<string, number[]>> = { KES: [2_000, 5_000, 10_000, 20_000, 50_000, 100_000] };

/** Seconds a member must wait before asking for another prompt (stops a double tap paying twice). */
export const CONTRIBUTION_RETRY_SECONDS = 90;

/**
 * The ways a member can pay a contribution in this country, best first.
 * Empty when the country's way is not switched on yet.
 */
export function contributionPayOptions(input: {
  country: string | null | undefined;
  mpesaOn: boolean;
  mobileMoneyOn?: boolean;
}): ContributionPayOption[] {
  const local = localMethodFor(input.country);
  if (!local) return [];
  if (local.rail === 'MPESA' && input.mpesaOn) return [{ way: 'MPESA', label: local.label, currency: local.currency }];
  if (local.rail === 'MOBILE_MONEY' && input.mobileMoneyOn) return [{ way: 'MOBILE_MONEY', label: local.label, currency: local.currency }];
  return [];
}

export type ContributionAmountCheck = { ok: true; amountCents: number } | { ok: false; error: { en: string; sw: string } };

const whole = (cents: number) => (cents / 100).toLocaleString('en-KE');

/** Whole currency units only, within the smallest and largest one payment can be. */
export function checkContributionAmount(amountCents: unknown, currency = 'KES'): ContributionAmountCheck {
  const min = CONTRIBUTION_MIN_CENTS[currency] ?? 100;
  const max = CONTRIBUTION_MAX_CENTS[currency] ?? 25_000_000;
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0 || amountCents % 100 !== 0) {
    return { ok: false, error: { en: 'Enter a whole amount, without cents.', sw: 'Weka kiasi kamili, bila senti.' } };
  }
  if (amountCents < min) {
    return { ok: false, error: { en: `The smallest amount is ${currency} ${whole(min)}.`, sw: `Kiasi cha chini ni ${currency} ${whole(min)}.` } };
  }
  if (amountCents > max) {
    return { ok: false, error: { en: `One payment cannot be more than ${currency} ${whole(max)}.`, sw: `Malipo moja hayawezi kuzidi ${currency} ${whole(max)}.` } };
  }
  return { ok: true, amountCents };
}

/** True when the member asked for a prompt too recently to ask again. */
export function contributionTooSoon(lastRequestAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!lastRequestAt) return false;
  return now.getTime() - lastRequestAt.getTime() < CONTRIBUTION_RETRY_SECONDS * 1000;
}

/**
 * Member self-pay is OFF until the owner switches it on (MEMBER_PAY_ENABLED=true),
 * because where a group's money settles is an owner and legal decision.
 */
export function memberPayEnabled(env: Record<string, string | undefined>): boolean {
  return (env.MEMBER_PAY_ENABLED ?? '').trim().toLowerCase() === 'true';
}

/** What the paying member's statement shows, e.g. "UMOJA" — letters and digits, 12 at most. */
export function contributionReference(groupName: string): string {
  const ref = groupName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return ref || 'STAWI';
}
