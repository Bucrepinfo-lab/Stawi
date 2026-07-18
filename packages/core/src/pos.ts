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
  /** Item barcode / SKU — the same code used when purchased, stocked and sold. */
  barcode?: string;
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
  barcode?: string;
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
    barcode: it.barcode,
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

// ───────────────────────── Barcodes (items) ─────────────────────────

/** Normalise a scanned/typed barcode: digits only, trimmed. */
export function normalizeBarcode(raw: string): string {
  return (raw ?? '').replace(/[^0-9]/g, '');
}

/**
 * EAN-13 check digit (odd×1 + even×3). Lets the POS validate a scan and lets us
 * mint a valid barcode for a new item from a 12-digit base.
 */
export function ean13CheckDigit(twelve: string): number {
  const d = normalizeBarcode(twelve).slice(0, 12).padStart(12, '0').split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  const c = normalizeBarcode(code);
  return c.length === 13 && ean13CheckDigit(c.slice(0, 12)) === Number(c[12]);
}

/** Mint a valid EAN-13 from any seed string (deterministic) for a new item. */
export function generateBarcode(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const base = String((h >>> 0)).padStart(12, '0').slice(0, 12);
  return base + ean13CheckDigit(base);
}

// ─────────────────────── Payment prompts (M-Pesa, cash…) ───────────────────────

export interface PaymentField {
  id: string;
  label: string;
  kind: 'phone' | 'money' | 'text';
  placeholder?: string;
}

export interface PaymentPrompt {
  method: PayMethod;
  title: string;
  instruction: string;
  fields: PaymentField[];
  cta: string;
}

export interface PaymentResult {
  ok: boolean;
  method: PayMethod;
  message: string;
  changeCents?: number;
  reference?: string;
  error?: string;
}

/** The prompt to show the cashier for a given method + amount due. */
export function buildPaymentPrompt(method: PayMethod, totalCents: number): PaymentPrompt {
  const due = kes(totalCents);
  switch (method) {
    case 'MPESA':
      return {
        method,
        title: 'M-Pesa STK Push',
        instruction: `A payment request for ${due} will be sent to the customer's phone. Ask them to enter their M-Pesa PIN.`,
        fields: [{ id: 'phone', label: 'Customer phone', kind: 'phone', placeholder: '07XX XXX XXX' }],
        cta: `Send prompt · ${due}`,
      };
    case 'CASH':
      return {
        method,
        title: 'Cash payment',
        instruction: `Amount due ${due}. Enter cash received to compute change.`,
        fields: [{ id: 'tendered', label: 'Cash received', kind: 'money', placeholder: 'KES' }],
        cta: 'Confirm cash',
      };
    case 'CARD':
      return {
        method,
        title: 'Card payment',
        instruction: `Insert or tap the card on the terminal for ${due}.`,
        fields: [{ id: 'reference', label: 'Terminal reference', kind: 'text', placeholder: 'Auth code' }],
        cta: `Charge ${due}`,
      };
    case 'BANK':
      return {
        method,
        title: 'Bank transfer',
        instruction: `Confirm the bank transfer of ${due} and enter the reference.`,
        fields: [{ id: 'reference', label: 'Transfer reference', kind: 'text', placeholder: 'Bank ref' }],
        cta: 'Confirm transfer',
      };
  }
}

/** Change owed to the customer for a cash payment (never negative). */
export function changeDue(totalCents: number, tenderedCents: number): number {
  return Math.max(0, tenderedCents - totalCents);
}

/**
 * Settle a payment from the prompt inputs. Pure & deterministic — the actual
 * M-Pesa STK / card capture happens at the edge; this validates and shapes the
 * result the receipt is built from.
 */
export function settlePayment(
  method: PayMethod,
  totalCents: number,
  input: { tenderedCents?: number; phone?: string; reference?: string },
): PaymentResult {
  switch (method) {
    case 'CASH': {
      const tendered = input.tenderedCents ?? 0;
      if (tendered < totalCents) {
        return { ok: false, method, message: 'Insufficient cash received.', error: `Short by ${kes(totalCents - tendered)}` };
      }
      const change = changeDue(totalCents, tendered);
      return { ok: true, method, message: change > 0 ? `Give change ${kes(change)}` : 'Exact cash — no change', changeCents: change };
    }
    case 'MPESA': {
      const phone = (input.phone ?? '').replace(/[^\d+]/g, '');
      if (phone.replace(/\D/g, '').length < 9) {
        return { ok: false, method, message: 'Enter a valid customer phone number.', error: 'Invalid phone' };
      }
      return { ok: true, method, message: `STK push sent to ${phone} for ${kes(totalCents)}. Awaiting PIN.`, reference: 'STK-' + receiptNumber(phone + totalCents).slice(4) };
    }
    case 'CARD':
    case 'BANK': {
      const ref = (input.reference ?? '').trim();
      if (!ref) return { ok: false, method, message: 'Enter the payment reference.', error: 'Missing reference' };
      return { ok: true, method, message: `${method === 'CARD' ? 'Card' : 'Transfer'} confirmed (${ref}).`, reference: ref };
    }
  }
}
