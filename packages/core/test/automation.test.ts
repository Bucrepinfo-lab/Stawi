import { describe, it, expect } from 'vitest';
import { classifyStock, type StockItem, type LedgerEntry } from '../src/accounting';
import { buildPosReceipt } from '../src/pos';
import {
  economicOrderQty,
  draftPurchaseOrder,
  autoReorderQueue,
  approvePurchaseOrder,
  composeReceiptMessage,
  composeOwnerDailyMessage,
  buildEtimsInvoice,
  buildZReport,
  zReportText,
} from '../src/automation';

const stock: StockItem[] = [
  { id: 's1', name: 'Sugar 2kg', quantity: 2, reorderLevel: 10, soldInWindow: 60, supplierName: 'Kabras', supplierPhone: '254700111222' },
  { id: 's2', name: 'Soap', quantity: 40, reorderLevel: 10, soldInWindow: 5 },
  { id: 's3', name: 'Flour', quantity: 4, reorderLevel: 10, soldInWindow: 20 },
];
const insights = classifyStock(stock);

describe('auto-reorder', () => {
  it('tops stock up to 2× reorder level', () => {
    expect(economicOrderQty({ quantity: 2, reorderLevel: 10 })).toBe(18);
    expect(economicOrderQty({ quantity: 25, reorderLevel: 10 })).toBe(1); // never below 1
  });

  it('drafts a supplier PO with a ready-to-send message', () => {
    const po = draftPurchaseOrder(insights[0]!, 'Zawadi Retail');
    expect(po.orderQty).toBe(18);
    expect(po.supplierName).toBe('Kabras');
    expect(po.smsText).toContain('18 units of Sugar 2kg');
    expect(po.status).toBe('DRAFT');
    expect(approvePurchaseOrder(po).status).toBe('APPROVED');
  });

  it('queues POs for all low items, most critical first', () => {
    const q = autoReorderQueue(insights, 'Zawadi Retail');
    expect(q.map((p) => p.itemName)).toEqual(['Sugar 2kg', 'Flour']); // soap is OK
  });
});

describe('e-receipts', () => {
  const r = buildPosReceipt({ businessName: 'Zawadi Retail', saleId: 'sale-1', dateISO: '2026-07-10T09:00:00Z', amountCents: 100000, taxCents: 13793, paymentMethod: 'MPESA' });
  it('composes an SMS receipt to the customer', () => {
    const m = composeReceiptMessage(r, '0712345678');
    expect(m.channel).toBe('SMS');
    expect(m.to).toBe('0712345678');
    expect(m.text).toContain(r.receiptNo);
    expect(m.text).toContain('Zawadi Retail');
  });
  it('supports WhatsApp channel', () => {
    expect(composeReceiptMessage(r, '0712345678', 'WHATSAPP').channel).toBe('WHATSAPP');
  });
});

describe('KRA eTIMS', () => {
  it('builds a deterministic compliant invoice with control code + QR', () => {
    const inv = buildEtimsInvoice({ saleId: 'sale-1', totalCents: 116000, taxCents: 16000 }, { pin: 'P051234567X' });
    expect(inv.invoiceNo).toMatch(/^INV-/);
    expect(inv.scuId).toMatch(/^KRACU/);
    expect(inv.vatableCents).toBe(100000);
    expect(inv.vatCents).toBe(16000);
    expect(inv.qrUrl).toContain(inv.controlCode);
    expect(buildEtimsInvoice({ saleId: 'sale-1', totalCents: 116000, taxCents: 16000 }).controlCode).toBe(inv.controlCode);
  });
});

describe('close-of-day Z-report', () => {
  const now = new Date('2026-07-18T18:00:00Z');
  const entries: LedgerEntry[] = [
    { id: 'e1', type: 'SALE', description: 'x', amountCents: 300000, occurredAt: now },
    { id: 'e2', type: 'SALE', description: 'y', amountCents: 200000, occurredAt: now },
    { id: 'e3', type: 'PURCHASE', description: 'z', amountCents: 150000, occurredAt: now },
    { id: 'e4', type: 'EXPENSE', description: 'rent', amountCents: 50000, occurredAt: now },
  ];
  const payments = [
    { amountCents: 300000, method: 'MPESA' as const },
    { amountCents: 200000, method: 'CASH' as const },
  ];

  it('aggregates sales, tax, payment mix and expected cash', () => {
    const z = buildZReport(entries, insights, payments, now.toISOString());
    expect(z.salesCount).toBe(2);
    expect(z.grossSalesCents).toBe(500000);
    expect(z.netProfitCents).toBe(300000); // 500 - 150 - 50
    expect(z.cashExpectedCents).toBe(200000);
    expect(z.byPayment.find((p) => p.method === 'MPESA')!.amountCents).toBe(300000);
    expect(z.itemsSold[0].name).toBe('Sugar 2kg'); // most sold
    expect(z.reorderList.map((r) => r.name)).toEqual(['Sugar 2kg', 'Flour']);
  });

  it('renders a printable Z-report and an owner digest SMS', () => {
    const z = buildZReport(entries, insights, payments, now.toISOString());
    const text = zReportText(z, 'Zawadi Retail');
    expect(text).toContain('CLOSE OF DAY');
    expect(text).toContain('Cash expected in drawer');
    const sms = composeOwnerDailyMessage(z, '254700999888');
    expect(sms.text).toContain('Close of day');
    expect(sms.to).toBe('254700999888');
  });

  it('defaults all sales to cash when no payment mix is given', () => {
    const z = buildZReport(entries, insights);
    expect(z.byPayment).toHaveLength(1);
    expect(z.byPayment[0].method).toBe('CASH');
  });
});
