/**
 * Paying for a Stawi plan by M-Pesa (owner decision 19/11/26: M-Pesa leads in
 * Kenya, Paddle second). A group official (chairman or treasurer) asks M-Pesa
 * to prompt their own verified phone; nothing is paid without their PIN. The
 * plan only moves when Safaricom's callback confirms the payment, once.
 * M-Pesa is a direct sale: no VAT until the company is VAT-registered.
 */

export type PlanPeriod = 'MONTH' | 'YEAR';

/** Who may pay the group's plan: its chairman or treasurer. */
export const PLAN_PAYER_ROLES: ReadonlySet<string> = new Set(['CHAIRMAN', 'TREASURER']);

/** Months a paid period covers (a year is paid at 10 months' price but covers 12). */
export const PLAN_PERIOD_MONTHS: Record<PlanPeriod, number> = { MONTH: 1, YEAR: 12 };

function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * The new end of the paid period: a payment adds its months after whatever is
 * already paid (or from now, if nothing paid is still running).
 */
export function planPeriodEndAfterPayment(currentEnd: Date | null | undefined, now: Date, period: PlanPeriod): Date {
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return addMonths(start, PLAN_PERIOD_MONTHS[period]);
}

/**
 * Whether a confirmed M-Pesa amount (whole shillings, from Safaricom) covers
 * the price we asked for (cents). Anything less unlocks nothing.
 */
export function planPaymentCovers(paidKes: number | null | undefined, expectedCents: number): boolean {
  if (paidKes == null || !Number.isFinite(paidKes)) return false;
  return Math.round(paidKes * 100) >= expectedCents;
}
