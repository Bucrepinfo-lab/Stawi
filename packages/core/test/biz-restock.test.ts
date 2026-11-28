import { describe, expect, it } from 'vitest';
import type { BizEntry } from '../src/biz-books';
import {
  crossedRedLine, restockList, restockMessage, restockMoveProblem, suggestOrderQty, suggestRedLine, whatsappLink,
  type BizSupplier, type RestockItem,
} from '../src/biz-restock';
import { itemPositions } from '../src/biz-items';

let n = 0;
const e = (x: Partial<BizEntry> & Pick<BizEntry, 'kind' | 'amountCents'>): BizEntry => ({ id: `r${++n}`, channel: 'CASH', day: '2026-11-01', branchId: 'main', ...x });

/** Owner 28/11/26: a shop that trades with more than 5 crates of soda; below 5, ask the supplier. */
function sodaShop() {
  const suppliers: BizSupplier[] = [{ id: 'coke', name: 'Mwangi Distributors', phone: '0712 345 678', leadDays: 1 }];
  const items: RestockItem[] = [
    { id: 'soda', name: 'Soda 300ml', unit: 'crate', priceCents: 900_00, reorderAt: 5, supplierId: 'coke' },
    { id: 'bread', name: 'Bread', unit: 'loaf', priceCents: 70_00, reorderAt: 0, supplierId: null },
    { id: 'salt', name: 'Salt', unit: 'packet', priceCents: 30_00, reorderAt: 3, supplierId: null },
  ];
  const entries: BizEntry[] = [
    e({ kind: 'STOCK_IN', itemId: 'soda', qty: 20, amountCents: 15_600_00 }),
    e({ kind: 'STOCK_IN', itemId: 'bread', qty: 50, amountCents: 2_750_00 }),
    e({ kind: 'STOCK_IN', itemId: 'salt', qty: 40, amountCents: 800_00 }),
  ];
  for (let d = 2; d <= 12; d++) {
    const day = `2026-11-${String(d).padStart(2, '0')}`;
    if (d <= 9) entries.push(e({ kind: 'SALE', itemId: 'soda', qty: 2, amountCents: 1_800_00, costCents: 1_560_00, day }));
    entries.push(e({ kind: 'SALE', itemId: 'bread', qty: 4, amountCents: 280_00, costCents: 220_00, day }));
  }
  return { suppliers, items, entries };
}

describe('red lines and restock suggestions', () => {
  it('the soda at 4 crates (below its red line of 5) is on the list for its supplier, with a quantity', () => {
    const { suppliers, items, entries } = sodaShop();
    expect(itemPositions(entries).get('soda')!.qty).toBe(4);
    const list = restockList(entries, items, suppliers, '2026-11-12');
    const coke = list.find((g) => g.supplier?.id === 'coke')!;
    expect(coke.lines.map((l) => l.itemId)).toEqual(['soda']);
    const soda = coke.lines[0]!;
    expect(soda.redLine).toBe(5);
    expect(soda.onHand).toBe(4);
    expect(soda.qty).toBeGreaterThanOrEqual(5);
    // Items without a supplier still show, last, so nothing is missed.
    expect(list.at(-1)!.supplier).toBeNull();
    expect(list.at(-1)!.lines.map((l) => l.itemId)).toContain('bread');
    // Salt is well above its red line: not on the list.
    expect(list.flatMap((g) => g.lines).some((l) => l.itemId === 'salt')).toBe(false);
  });
  it('a branch that never carried an item is not asked to restock it', () => {
    const { suppliers, items, entries } = sodaShop();
    expect(restockList(entries, items, suppliers, '2026-11-12', 'kisumu')).toEqual([]);
  });
  it('crossing the red line is detected once, at the sale that crosses it', () => {
    expect(crossedRedLine(6, 4, 5)).toBe(true);
    expect(crossedRedLine(6, 5, 5)).toBe(true);
    expect(crossedRedLine(5, 3, 5)).toBe(false); // already below: no second alarm
    expect(crossedRedLine(9, 7, 5)).toBe(false);
    expect(crossedRedLine(9, 0, 0)).toBe(false); // no red line set
  });
  it('suggested red line = sales per day × (delivery days + 2); order lasts the delivery time plus a week', () => {
    expect(suggestRedLine(2, 1)).toBe(6);
    expect(suggestRedLine(0, 3)).toBe(0);
    expect(suggestOrderQty({ onHand: 4, perDay: 2, redLine: 5, leadDays: 1 })).toBe(2 * 8 + 5 - 4);
    expect(suggestOrderQty({ onHand: 0, perDay: 0, redLine: 5, leadDays: 1 })).toBe(10);
    expect(suggestOrderQty({ onHand: 50, perDay: 1, redLine: 5, leadDays: 1 })).toBe(1);
  });
});

describe('telling the supplier', () => {
  it('a WhatsApp link with the message ready, in the international format WhatsApp needs', () => {
    expect(whatsappLink('0712 345 678', 'Hi')).toBe('https://wa.me/254712345678?text=Hi');
    expect(whatsappLink('+256 772 000111', 'Hi there')).toBe('https://wa.me/256772000111?text=Hi%20there');
    expect(whatsappLink('12', 'x')).toBeNull();
  });
  it('the message names the shop, the items and quantities, or lets the supplier decide', () => {
    const text = restockMessage({ supplierName: 'Mwangi', shopName: 'Mama Njeri Shop', branch: 'Kisumu kiosk', town: 'Kisumu', lines: [{ name: 'Soda 300ml', unit: 'crate', qty: 17 }, { name: 'Bread', unit: 'loaf', qty: null }], link: 'https://getstawi.com/orders' });
    expect(text).toContain('Mama Njeri Shop, Kisumu kiosk, Kisumu');
    expect(text).toContain('Soda 300ml: 17 crate');
    expect(text).toContain('Bread: the quantity you advise');
    expect(text).toContain('https://getstawi.com/orders');
    expect(restockMessage({ supplierName: 'Mwangi', shopName: 'Duka', lines: [{ name: 'Soda', unit: 'crate', qty: 3 }], lang: 'sw' })).toMatch(/Habari Mwangi/);
  });
});

describe('the request from sent to delivered', () => {
  it('the supplier confirms, sends and delivers; the shop can cancel before it is on the way', () => {
    expect(restockMoveProblem('SENT', 'CONFIRMED', 'SUPPLIER')).toBeNull();
    expect(restockMoveProblem('CONFIRMED', 'ON_THE_WAY', 'SUPPLIER')).toBeNull();
    expect(restockMoveProblem('ON_THE_WAY', 'DELIVERED', 'SUPPLIER')).toBeNull();
    expect(restockMoveProblem('SENT', 'CANCELLED', 'SHOP')).toBeNull();
    expect(restockMoveProblem('ON_THE_WAY', 'CANCELLED', 'SHOP')).not.toBeNull();
    expect(restockMoveProblem('SENT', 'CANCELLED', 'SUPPLIER')).not.toBeNull();
    expect(restockMoveProblem('DELIVERED', 'CANNOT', 'SUPPLIER')).toMatch(/finished/);
  });
});
