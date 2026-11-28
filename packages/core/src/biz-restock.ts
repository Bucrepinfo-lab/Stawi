/**
 * Restocking (owner 28/11/26): each item has a red line (the stock level at
 * which to reorder) and a supplier. When stock falls to the red line the owner
 * is alerted, and one tap asks the supplier to bring more, with a suggested
 * quantity the owner can change or leave to the supplier.
 *
 * Built on the shop's OWN suppliers (the people it already trusts), not on a
 * marketplace: research on East African B2B ordering apps found retailers go
 * back to their usual suppliers once discounts stop. The supplier gets the
 * request in Stawi if they use it, and on WhatsApp either way.
 *
 * The rule: reorder point = sales per day × days the supplier takes + a safety
 * cushion; order enough to last until the next delivery plus a week. Nothing
 * is ever ordered without the owner's tap: a request commits money.
 */
import { phoneKey } from './identity';
import type { BizEntry } from './biz-books';
import { itemInsights, type BizItem, type ItemInsight } from './biz-items';

export interface BizSupplier {
  id: string;
  name: string;
  phone: string;
  /** Days from asking to delivery (1 = next day). */
  leadDays: number;
}

/** An item with its supplier (null = no supplier chosen yet). */
export type RestockItem = BizItem & { supplierId?: string | null };

/** Days of sales kept as a cushion on top of the delivery time. */
export const SAFETY_DAYS = 2;
/** After a delivery, stock should last this many days beyond the next delivery. */
export const COVER_DAYS = 7;

/** The red line Stawi suggests from how fast the item sells and how long the supplier takes. */
export function suggestRedLine(perDay: number, leadDays: number): number {
  if (!(perDay > 0)) return 0;
  return Math.max(1, Math.ceil(perDay * (Math.max(0, leadDays) + SAFETY_DAYS)));
}

/** How many to ask for: enough to last the delivery time plus a week, above the red line. */
export function suggestOrderQty(input: { onHand: number; perDay: number; redLine: number; leadDays: number }): number {
  const { onHand, perDay, redLine, leadDays } = input;
  const target = perDay > 0 ? Math.ceil(perDay * (Math.max(0, leadDays) + COVER_DAYS)) + redLine : Math.max(redLine * 2, 1);
  return Math.max(1, target - Math.max(0, Math.floor(onHand)));
}

/** True when a sale or loss takes stock from above the red line to at or below it. */
export function crossedRedLine(before: number, after: number, redLine: number): boolean {
  return redLine > 0 && before > redLine && after <= redLine;
}

export interface RestockLine {
  itemId: string;
  name: string;
  unit: string;
  onHand: number;
  redLine: number;
  /** Suggested quantity; null = "the supplier decides". */
  qty: number | null;
  daysLeft: number | null;
}

export interface RestockGroup {
  supplier: BizSupplier | null;
  lines: RestockLine[];
}

/**
 * Everything at or below its red line (or out of stock), grouped by supplier,
 * with a suggested quantity for each. Items without a supplier come last.
 */
export function restockList(entries: BizEntry[], items: RestockItem[], suppliers: BizSupplier[], today: string, branchId?: string): RestockGroup[] {
  const insights = itemInsights(entries, items, today, { branchId });
  const groups = new Map<string, RestockGroup>();
  for (const ins of insights) {
    const item = ins.item as RestockItem;
    // A branch that never carried or sold the item has nothing to restock.
    if (item.service || ins.movement === 'none') continue;
    const due = ins.risks.includes('red_line') || ins.risks.includes('out_of_stock') || ins.risks.includes('running_out');
    if (!due) continue;
    const supplier = suppliers.find((s) => s.id === item.supplierId) ?? null;
    const key = supplier?.id ?? '';
    const g = groups.get(key) ?? { supplier, lines: [] };
    g.lines.push(lineFor(ins, supplier));
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => Number(!a.supplier) - Number(!b.supplier) || b.lines.length - a.lines.length);
}

function lineFor(ins: ItemInsight, supplier: BizSupplier | null): RestockLine {
  const redLine = ins.item.reorderAt > 0 ? ins.item.reorderAt : suggestRedLine(ins.perDay, supplier?.leadDays ?? 1);
  return {
    itemId: ins.item.id, name: ins.item.name, unit: ins.item.unit, onHand: ins.qty, redLine, daysLeft: ins.daysLeft,
    qty: suggestOrderQty({ onHand: ins.qty, perDay: ins.perDay, redLine, leadDays: supplier?.leadDays ?? 1 }),
  };
}

// ───────────────────────────── The request's life ─────────────────────────────

export type RestockStatus = 'SENT' | 'SEEN' | 'CONFIRMED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANNOT' | 'CANCELLED';

export const RESTOCK_STATUS: Record<RestockStatus, { en: string; sw: string; open: boolean }> = {
  SENT: { en: 'Sent', sw: 'Imetumwa', open: true },
  SEEN: { en: 'Seen by the supplier', sw: 'Msambazaji ameona', open: true },
  CONFIRMED: { en: 'Confirmed', sw: 'Imethibitishwa', open: true },
  ON_THE_WAY: { en: 'On the way', sw: 'Iko njiani', open: true },
  DELIVERED: { en: 'Delivered', sw: 'Imefika', open: false },
  CANNOT: { en: 'Supplier cannot supply', sw: 'Msambazaji hawezi', open: false },
  CANCELLED: { en: 'Cancelled', sw: 'Imeghairiwa', open: false },
};

const NEXT: Record<'SUPPLIER' | 'SHOP', Partial<Record<RestockStatus, RestockStatus[]>>> = {
  SUPPLIER: {
    SENT: ['SEEN', 'CONFIRMED', 'ON_THE_WAY', 'CANNOT'],
    SEEN: ['CONFIRMED', 'ON_THE_WAY', 'CANNOT'],
    CONFIRMED: ['ON_THE_WAY', 'DELIVERED', 'CANNOT'],
    ON_THE_WAY: ['DELIVERED'],
  },
  SHOP: {
    SENT: ['CANCELLED', 'DELIVERED'],
    SEEN: ['CANCELLED', 'DELIVERED'],
    CONFIRMED: ['CANCELLED', 'DELIVERED'],
    ON_THE_WAY: ['DELIVERED'],
  },
};

/** A plain reason the change is not allowed, or null. */
export function restockMoveProblem(from: RestockStatus, to: RestockStatus, side: 'SUPPLIER' | 'SHOP'): string | null {
  if (!RESTOCK_STATUS[from]?.open) return 'This request is already finished.';
  return NEXT[side][from]?.includes(to) ? null : 'That step is not possible now.';
}

// ───────────────────────────── The message ─────────────────────────────

const DIAL: Record<string, string> = { KE: '254', UG: '256', TZ: '255', RW: '250', BI: '257', ET: '251', SS: '211', ZM: '260', MW: '265', NG: '234', GH: '233' };

/** A WhatsApp click-to-chat link with the message ready; the owner still presses send. */
export function whatsappLink(phone: string, text: string, country = 'KE'): string | null {
  const raw = phone.replace(/[^\d+]/g, '');
  let digits: string;
  if (raw.startsWith('+')) digits = raw.slice(1);
  else if (raw.startsWith('00')) digits = raw.slice(2);
  else {
    const key = phoneKey(phone);
    if (!key) return null;
    digits = `${DIAL[country.toUpperCase()] ?? '254'}${key}`;
  }
  if (!/^\d{9,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** The request in plain words, ready for WhatsApp. */
export function restockMessage(input: { supplierName: string; shopName: string; branch?: string; town?: string; lines: { name: string; unit: string; qty: number | null }[]; note?: string; link?: string; lang?: 'en' | 'sw' }): string {
  const sw = input.lang === 'sw';
  const where = [input.shopName, input.branch && input.branch !== 'Main' ? input.branch : '', input.town].filter(Boolean).join(', ');
  const list = input.lines.map((l) => `• ${l.name}: ${l.qty === null ? (sw ? 'kiasi utakachoona kinafaa' : 'the quantity you advise') : `${l.qty} ${l.unit}`}`).join('\n');
  const head = sw
    ? `Habari ${input.supplierName}. ${where} inahitaji bidhaa hizi:`
    : `Hello ${input.supplierName}. ${where} is running low and would like a delivery of:`;
  const tail = sw ? 'Tafadhali thibitisha siku ya kuleta.' : 'Please confirm when you can deliver.';
  return [head, list, input.note ? input.note : '', tail, input.link ? `${sw ? 'Ona na uthibitishe kwenye Stawi' : 'See and confirm on Stawi'}: ${input.link}` : ''].filter(Boolean).join('\n');
}
