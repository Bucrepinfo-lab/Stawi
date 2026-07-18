import { describe, it, expect } from 'vitest';
import { classifyStock, type StockItem } from '../src/accounting';
import {
  buildPosReceipt,
  toCsv,
  ledgerCsv,
  stockCsv,
  criticalStockAlerts,
  acknowledgeAlert,
  outstandingAlerts,
  ackFor,
  feedbackLabel,
} from '../src/pos';
import type { LedgerEntry } from '../src/accounting';

describe('buildPosReceipt', () => {
  it('totals an itemised sale with tax and a deterministic receipt no', () => {
    const r = buildPosReceipt({
      businessName: 'Zawadi Retail',
      saleId: 'sale-1',
      dateISO: '2026-07-10T09:00:00Z',
      items: [
        { name: 'Sugar 2kg', qty: 2, unitPriceCents: 25_000 },
        { name: 'Soap', qty: 1, unitPriceCents: 12_000 },
      ],
      taxCents: 9_920,
      paymentMethod: 'MPESA',
    });
    expect(r.subtotalCents).toBe(62_000);
    expect(r.taxCents).toBe(9_920);
    expect(r.totalCents).toBe(71_920);
    expect(r.lines).toHaveLength(2);
    expect(r.paymentLabel).toBe('M-Pesa');
    expect(r.receiptNo).toMatch(/^STW-/);
    // deterministic
    expect(buildPosReceipt({ businessName: 'Zawadi Retail', saleId: 'sale-1', dateISO: '2026-07-10T09:00:00Z' }).receiptNo).toBe(r.receiptNo);
  });

  it('builds a single-line receipt from a plain amount', () => {
    const r = buildPosReceipt({ businessName: 'B', saleId: 's2', dateISO: '2026-07-10', amountCents: 50_000 });
    expect(r.lines).toHaveLength(1);
    expect(r.totalCents).toBe(50_000);
    expect(r.paymentLabel).toBe('Cash');
  });
});

describe('CSV exports', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(toCsv([['a', 'b,c', 'd"e']])).toBe('a,"b,c","d""e"');
  });

  it('exports a ledger with a header row', () => {
    const entries: LedgerEntry[] = [
      { id: 'e1', type: 'SALE', description: 'Morning sales', amountCents: 120_000, occurredAt: new Date('2026-07-10T08:00:00Z') },
    ];
    const csv = ledgerCsv(entries);
    expect(csv.split('\r\n')[0]).toBe('Date,Type,Description,Amount (KES)');
    expect(csv).toContain('2026-07-10,SALE,Morning sales,1200.00');
  });

  it('exports stock insights', () => {
    const insights = classifyStock([{ id: 's1', name: 'Sugar', quantity: 2, reorderLevel: 10, soldInWindow: 60 }]);
    const csv = stockCsv(insights);
    expect(csv.split('\r\n')[0]).toContain('Item,Qty,Reorder level');
    expect(csv).toContain('Sugar');
  });
});

describe('critical stock alerts + acknowledgement', () => {
  const stock: StockItem[] = [
    { id: 's1', name: 'Sugar', quantity: 2, reorderLevel: 10, soldInWindow: 60 }, // critical
    { id: 's2', name: 'Flour', quantity: 8, reorderLevel: 10, soldInWindow: 20 }, // low, not critical
    { id: 's3', name: 'Soap', quantity: 40, reorderLevel: 10, soldInWindow: 5 }, // OK
  ];
  const insights = classifyStock(stock);

  it('lists reorder alerts, most critical first', () => {
    const alerts = criticalStockAlerts(insights);
    expect(alerts.map((a) => a.itemId)).toEqual(['s1', 's2']);
    expect(alerts[0].critical).toBe(true);
  });

  it('acknowledging an alert clears it from the outstanding list and records feedback', () => {
    const alerts = criticalStockAlerts(insights);
    const acks = [acknowledgeAlert('s1', 'REORDERED', '2026-07-10T10:00:00Z')];
    const left = outstandingAlerts(alerts, acks);
    expect(left.map((a) => a.itemId)).toEqual(['s2']); // s1 handled
    const a = ackFor('s1', acks)!;
    expect(a.feedback).toBe('REORDERED');
    expect(feedbackLabel(a.feedback)).toBe('Reordered');
  });

  it('keeps only the latest acknowledgement for an item', () => {
    const acks = [
      acknowledgeAlert('s1', 'ORDERING_TODAY', '2026-07-10T10:00:00Z'),
      acknowledgeAlert('s1', 'RESTOCKED', '2026-07-10T15:00:00Z'),
    ];
    expect(ackFor('s1', acks)!.feedback).toBe('RESTOCKED');
  });
});
