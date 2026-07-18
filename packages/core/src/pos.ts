/**
 * Point-of-sale & operations — Pillar 3.
 *
 * The "real running shop" layer on top of the accounting engine:
 *   - printable POS sale receipts,
 *   - downloadable exports (ledger / stock / tax as CSV),
 *   - critical stock-level alerts with an acknowledgement + feedback loop.
 *
 * Pure functions, integer minor units (cents). Rendering (print/download) lives
 * in the app; this is the testable model.
 */

import { formatMoney } from './capital';
import { receiptNumber } from './receipt';
import type { LedgerEntry, StockInsight } from './accounting';
import type { TaxLine } from './tax';

// ───────────────────────────── POS receipts ─────────────────────────────

export interface PosLineItem {
  name: string;
  qty: number;
  unitPriceCents: number;
}

export type PayMethod = 'CASH' | 'MPESA' | 'CARD' | 'BANK';

export interface PosReceiptInput {
  businessName: string;
  saleId: string;
  dateISO: string;
  /** Itemised sale. If empty, a single line is built from `amountCents`. */
  items?: PosLineItem[];
  amountCents?: number;
  taxCents?: number;
  paymentMethod?: PayMethod;
  cashier?: string;
}

export interface PosReceiptLine {
  name: string;
  qty: number;
  unitDisplay: string;
  lineDisplay: string;
}

export interface PosReceiptModel {
  receiptNo: string;
  businessName: string;
  dateDisplay: string;
  lines: PosReceiptLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  subtotalDisplay: string;
  taxDisplay: string;
  totalDisplay: string;
  paymentLabel: string;
  cashier?: string;
}

const PAY_LABEL: Record<PayMethod, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  CARD: 'Card',
  BANK: 'Bank transfer',
};

const kes = (c: number) => `KES ${formatMoney(c)}`;

export function buildPosReceipt(input: PosReceiptInput): PosReceiptModel {
  const items = input.items ?? [];
  const lines: PosReceiptLine[] = items.map((it) => ({
    name: it.name,
    qty: it.qty,
    unitDisplay: kes(it.unitPriceCents),
    lineDisplay: kes(it.qty * it.unitPriceCents),
  }));
  let subtotal = items.reduce((a, it) => a + it.qty * it.unitPriceCents, 0);
  if (items.length === 0 && input.amountCents) {
    subtotal = input.amountCents;
    lines.push({ name: 'Sale', qty: 1, unitDisplay: kes(input.amountCents), lineDisplay: kes(input.amountCents) });
  }
  const tax = input.taxCents ?? 0;
  const total = subtotal + tax;
  const d = new Date(input.dateISO);
  return {
    receiptNo: receiptNumber(input.saleId),
    businessName: input.businessName,
    dateDisplay: isNaN(d.getTime()) ? input.dateISO : d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
    lines,
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: total,
    subtotalDisplay: kes(subtotal),
    taxDisplay: kes(tax),
    totalDisplay: kes(total),
    paymentLabel: PAY_LABEL[input.paymentMethod ?? 'CASH'],
    cashier: input.cashier,
  };
}

// ─────────────────────── Downloadable exports (CSV) ───────────────────────

/** RFC-4180-ish CSV: quote cells containing quotes, commas or newlines. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}

export function ledgerCsv(entries: LedgerEntry[]): string {
  return toCsv([
    ['Date', 'Type', 'Description', 'Amount (KES)'],
    ...entries.map((e) => [new Date(e.occurredAt).toISOString().slice(0, 10), e.type, e.description, (e.amountCents / 100).toFixed(2)]),
  ]);
}

export function stockCsv(insights: StockInsight[]): string {
  return toCsv([
    ['Item', 'Qty', 'Reorder level', 'Sold (window)', 'Movement', 'Status', 'Supplier', 'Phone'],
    ...insights.map((s) => [s.name, s.quantity, s.reorderLevel, s.soldInWindow, s.movement, s.critical ? 'Critical' : s.needsReorder ? 'Low' : 'OK', s.supplierName ?? '', s.supplierPhone ?? '']),
  ]);
}

export function taxCsv(lines: TaxLine[]): string {
  return toCsv([
    ['Code', 'Label', 'Amount (KES)', 'Remit to', 'Due by'],
    ...lines.map((l) => [l.code, l.label, (l.amountCents / 100).toFixed(2), l.remitTo, l.dueBy]),
  ]);
}

// ─────────────── Critical stock alerts + acknowledgement loop ───────────────

export type AlertFeedback = 'REORDERED' | 'ORDERING_TODAY' | 'RESTOCKED' | 'DISMISSED';

export const ALERT_FEEDBACK_OPTIONS: { id: AlertFeedback; label: string }[] = [
  { id: 'REORDERED', label: 'Reordered' },
  { id: 'ORDERING_TODAY', label: 'Ordering today' },
  { id: 'RESTOCKED', label: 'Restocked' },
  { id: 'DISMISSED', label: 'Dismiss for now' },
];

export interface StockAlert {
  itemId: string;
  itemName: string;
  quantity: number;
  reorderLevel: number;
  critical: boolean;
}

export interface AlertAck {
  itemId: string;
  feedback: AlertFeedback;
  acknowledgedAtISO: string;
  note?: string;
}

/** Items needing reorder, most critical first. */
export function criticalStockAlerts(insights: StockInsight[]): StockAlert[] {
  return insights
    .filter((s) => s.needsReorder)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || a.quantity - b.quantity)
    .map((s) => ({ itemId: s.id, itemName: s.name, quantity: s.quantity, reorderLevel: s.reorderLevel, critical: s.critical }));
}

export function acknowledgeAlert(itemId: string, feedback: AlertFeedback, atISO: string = new Date().toISOString(), note?: string): AlertAck {
  return { itemId, feedback, acknowledgedAtISO: atISO, note };
}

/** Alerts not yet acknowledged (any feedback clears an alert from the unhandled list). */
export function outstandingAlerts(alerts: StockAlert[], acks: AlertAck[]): StockAlert[] {
  const handled = new Set(acks.map((a) => a.itemId));
  return alerts.filter((a) => !handled.has(a.itemId));
}

/** The most recent acknowledgement for an item, if any. */
export function ackFor(itemId: string, acks: AlertAck[]): AlertAck | undefined {
  for (let i = acks.length - 1; i >= 0; i--) if (acks[i]!.itemId === itemId) return acks[i];
  return undefined;
}

export function feedbackLabel(f: AlertFeedback): string {
  return ALERT_FEEDBACK_OPTIONS.find((o) => o.id === f)?.label ?? f;
}
