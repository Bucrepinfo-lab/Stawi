/**
 * Notification builders — payment, stock, subscription, roles.
 * Pure models; delivery (in-app / SMS / push) is the app's concern.
 */

import { formatMoney } from './capital.js';
import type { StockInsight } from './accounting.js';

export type NotificationKind =
  | 'PAYMENT_CONFIRMED'
  | 'STOCK_LOW'
  | 'STOCK_CRITICAL'
  | 'SUBSCRIPTION_DUE'
  | 'ROLE_ASSIGNED'
  | 'PAYOUT';

export type Severity = 'info' | 'warn' | 'danger';

export interface AppNotification {
  kind: NotificationKind;
  title: string;
  body: string;
  severity: Severity;
  atISO: string;
}

const now = () => new Date().toISOString();

export function notifyPaymentConfirmed(
  memberName: string,
  amountCents: number,
  reference?: string,
): AppNotification {
  return {
    kind: 'PAYMENT_CONFIRMED',
    title: 'Payment received',
    body: `${memberName} contributed KES ${formatMoney(amountCents)}${reference ? ` (${reference})` : ''}.`,
    severity: 'info',
    atISO: now(),
  };
}

export function notifyPayout(recipientName: string, amountCents: number): AppNotification {
  return {
    kind: 'PAYOUT',
    title: 'Payout disbursed',
    body: `KES ${formatMoney(amountCents)} paid out to ${recipientName} this cycle.`,
    severity: 'info',
    atISO: now(),
  };
}

export function notifySubscriptionDue(groupName: string, amountCents: number): AppNotification {
  return {
    kind: 'SUBSCRIPTION_DUE',
    title: 'Subscription due',
    body: `${groupName}: KES ${formatMoney(amountCents)} due to keep Stawi active.`,
    severity: 'warn',
    atISO: now(),
  };
}

export function notifyRoleAssigned(memberName: string, role: string): AppNotification {
  return {
    kind: 'ROLE_ASSIGNED',
    title: 'Role assigned',
    body: `${memberName} is now ${role}.`,
    severity: 'info',
    atISO: now(),
  };
}

/** Turn low/critical stock into notifications (most urgent first). */
export function notificationsForStock(insights: StockInsight[]): AppNotification[] {
  return insights
    .filter((s) => s.needsReorder)
    .sort((a, b) => Number(b.critical) - Number(a.critical))
    .map((s) => ({
      kind: s.critical ? ('STOCK_CRITICAL' as const) : ('STOCK_LOW' as const),
      title: s.critical ? 'Stock critically low' : 'Stock running low',
      body: `${s.name}: ${s.quantity} left${s.supplierName ? ` — alert sent to ${s.supplierName}` : ''}.`,
      severity: s.critical ? ('danger' as const) : ('warn' as const),
      atISO: now(),
    }));
}
