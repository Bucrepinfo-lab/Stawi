/**
 * Business automation engine — Pillar 3.
 *
 * The "modern tools" layer that runs the shop with less manual work:
 *   1. Auto-reorder — draft purchase orders to suppliers when stock is low.
 *   2. E-receipts — compose SMS / WhatsApp receipts and owner digests.
 *   3. KRA eTIMS — generate compliant electronic tax invoices per sale.
 *   4. Close-of-day — a Z-report harmonising the day's trade.
 *
 * Pure & deterministic. The actual sending (SMS gateway, M-Pesa, eTIMS OSCU)
 * happens at the edge; this shapes exactly what gets sent, so it is testable.
 */

import { formatMoney } from './capital';
import { receiptNumber } from './receipt';
import type { PayMethod, PosReceiptModel } from './pos';
import type { LedgerEntry, StockInsight } from './accounting';
import { computePnL } from './accounting';

const kes = (c: number) => `KES ${formatMoney(c)}`;

// ───────────────────────── 1. Auto-reorder dispatch ─────────────────────────

export type POStatus = 'DRAFT' | 'APPROVED' | 'SENT';

export interface PurchaseOrder {
  itemId: string;
  itemName: string;
  currentQty: number;
  reorderLevel: number;
  /** How many units to order (top up to 2× reorder level, at least 1). */
  orderQty: number;
  supplierName?: string;
  supplierPhone?: string;
  /** Ready-to-send message to the supplier. */
  smsText: string;
  status: POStatus;
}

/** Economic top-up: bring stock to 2× reorder level. */
export function economicOrderQty(item: { quantity: number; reorderLevel: number }): number {
  return Math.max(1, item.reorderLevel * 2 - item.quantity);
}

export function draftPurchaseOrder(item: StockInsight, businessName: string): PurchaseOrder {
  const orderQty = economicOrderQty(item);
  const supplier = item.supplierName ? ` from ${item.supplierName}` : '';
  return {
    itemId: item.id,
    itemName: item.name,
    currentQty: item.quantity,
    reorderLevel: item.reorderLevel,
    orderQty,
    supplierName: item.supplierName,
    supplierPhone: item.supplierPhone,
    smsText: `Hi${item.supplierName ? ' ' + item.supplierName : ''}, ${businessName} would like to order ${orderQty} units of ${item.name}${supplier}. Please confirm price & delivery. Asante.`,
    status: 'DRAFT',
  };
}

/** Draft POs for every item that needs reordering, most critical first. */
export function autoReorderQueue(insights: StockInsight[], businessName: string): PurchaseOrder[] {
  return insights
    .filter((s) => s.needsReorder)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || a.quantity - b.quantity)
    .map((s) => draftPurchaseOrder(s, businessName));
}

export function approvePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return { ...po, status: 'APPROVED' };
}

// ─────────────────────── 2. SMS / WhatsApp e-receipts ───────────────────────

export type MsgChannel = 'SMS' | 'WHATSAPP';

export interface OutboundMessage {
  to: string;
  channel: MsgChannel;
  text: string;
}

export function composeReceiptMessage(r: PosReceiptModel, phone: string, channel: MsgChannel = 'SMS'): OutboundMessage {
  return {
    to: phone,
    channel,
    text: `${r.businessName}: receipt ${r.receiptNo}. Total ${r.totalDisplay} (VAT ${r.taxDisplay}) paid via ${r.paymentLabel}. Thank you!`,
  };
}

export function composeOwnerDailyMessage(z: ZReport, ownerPhone: string, channel: MsgChannel = 'SMS'): OutboundMessage {
  return {
    to: ownerPhone,
    channel,
    text: `Close of day ${z.dateDisplay}: ${z.salesCount} sales, ${kes(z.grossSalesCents)} in. Net ${kes(z.netProfitCents)}. VAT due ${kes(z.vatCents)}. ${z.reorderList.length} item(s) to reorder.`,
  };
}

// ───────────────────────── 3. KRA eTIMS e-invoicing ─────────────────────────

export interface EtimsInvoice {
  invoiceNo: string;
  /** Sales Control Unit id (mocked deterministically for the demo). */
  scuId: string;
  /** eTIMS receipt signature / control code. */
  controlCode: string;
  /** Verification QR payload (KRA eTIMS verifier URL). */
  qrUrl: string;
  vatableCents: number;
  vatCents: number;
  totalCents: number;
  pin?: string;
  dateISO: string;
}

function code(seed: string, len = 12): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, len);
}

export function buildEtimsInvoice(
  input: { saleId: string; totalCents: number; taxCents: number },
  opts: { pin?: string; dateISO?: string } = {},
): EtimsInvoice {
  const dateISO = opts.dateISO ?? new Date().toISOString();
  const controlCode = code(input.saleId + input.totalCents);
  const scuId = 'KRACU' + code(input.saleId, 10);
  const invoiceNo = 'INV-' + receiptNumber(input.saleId).slice(4);
  return {
    invoiceNo,
    scuId,
    controlCode,
    qrUrl: `https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=${controlCode}`,
    vatableCents: input.totalCents - input.taxCents,
    vatCents: input.taxCents,
    totalCents: input.totalCents,
    pin: opts.pin,
    dateISO,
  };
}

// ───────────────────────── 4. Close-of-day Z-report ─────────────────────────

export interface PaymentTally {
  method: PayMethod;
  count: number;
  amountCents: number;
}

export interface ZReport {
  dateDisplay: string;
  salesCount: number;
  grossSalesCents: number;
  cogsCents: number;
  expensesCents: number;
  vatCents: number;
  netProfitCents: number;
  byPayment: PaymentTally[];
  cashExpectedCents: number;
  itemsSold: { name: string; units: number }[];
  reorderList: { name: string; quantity: number; reorderLevel: number }[];
}

const VAT_RATE = 0.16;

/**
 * Harmonise the day's trade into a Z-report. `payments` (per-sale method +
 * amount) drives the payment breakdown and expected cash; if omitted, all
 * sales are treated as cash.
 */
export function buildZReport(
  entries: LedgerEntry[],
  insights: StockInsight[],
  payments?: { amountCents: number; method: PayMethod }[],
  dateISO: string = new Date().toISOString(),
): ZReport {
  const pnl = computePnL(entries);
  const salesEntries = entries.filter((e) => e.type === 'SALE');

  const pays = payments ?? salesEntries.map((e) => ({ amountCents: e.amountCents, method: 'CASH' as PayMethod }));
  const byMethod = new Map<PayMethod, PaymentTally>();
  for (const p of pays) {
    const t = byMethod.get(p.method) ?? { method: p.method, count: 0, amountCents: 0 };
    t.count += 1;
    t.amountCents += p.amountCents;
    byMethod.set(p.method, t);
  }
  const byPayment = [...byMethod.values()].sort((a, b) => b.amountCents - a.amountCents);
  const cashExpectedCents = byMethod.get('CASH')?.amountCents ?? 0;

  const d = new Date(dateISO);
  return {
    dateDisplay: isNaN(d.getTime()) ? dateISO : d.toLocaleDateString('en-KE', { dateStyle: 'full' }),
    salesCount: salesEntries.length,
    grossSalesCents: pnl.salesCents,
    cogsCents: pnl.costOfGoodsCents,
    expensesCents: pnl.expensesCents,
    vatCents: Math.round((pnl.salesCents * VAT_RATE) / (1 + VAT_RATE)),
    netProfitCents: pnl.netProfitCents,
    byPayment,
    cashExpectedCents,
    itemsSold: insights
      .filter((s) => s.soldInWindow > 0)
      .sort((a, b) => b.soldInWindow - a.soldInWindow)
      .map((s) => ({ name: s.name, units: s.soldInWindow })),
    reorderList: insights
      .filter((s) => s.needsReorder)
      .map((s) => ({ name: s.name, quantity: s.quantity, reorderLevel: s.reorderLevel })),
  };
}

/** Printable / downloadable plain-text Z-report. */
export function zReportText(z: ZReport, businessName: string): string {
  const lines = [
    `${businessName} — CLOSE OF DAY (Z-REPORT)`,
    z.dateDisplay,
    '',
    `Sales:            ${z.salesCount}`,
    `Gross sales:      ${kes(z.grossSalesCents)}`,
    `Cost of goods:    ${kes(z.cogsCents)}`,
    `Expenses:         ${kes(z.expensesCents)}`,
    `VAT due:          ${kes(z.vatCents)}`,
    `Net profit:       ${kes(z.netProfitCents)}`,
    '',
    'By payment method:',
    ...z.byPayment.map((p) => `  ${p.method.padEnd(6)} ${String(p.count).padStart(3)} txns  ${kes(p.amountCents)}`),
    `Cash expected in drawer: ${kes(z.cashExpectedCents)}`,
    '',
    'Items sold:',
    ...z.itemsSold.map((i) => `  ${i.name} × ${i.units}`),
    '',
    z.reorderList.length ? 'Reorder before tomorrow:' : 'No reorders needed.',
    ...z.reorderList.map((r) => `  ${r.name} (${r.quantity} left, level ${r.reorderLevel})`),
  ];
  return lines.join('\n');
}
