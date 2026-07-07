import { describe, it, expect } from 'vitest';
import {
  computePnL,
  reconcile,
  periodStart,
  classifyStock,
  reorderAlerts,
  financialSuggestions,
  type LedgerEntry,
  type StockItem,
} from '../src/accounting';

const e = (type: LedgerEntry['type'], amt: number, occurredAt: Date): LedgerEntry => ({
  id: Math.random().toString(36).slice(2),
  type,
  description: type,
  amountCents: amt,
  occurredAt,
});

describe('computePnL', () => {
  it('computes gross, net and margin', () => {
    const pnl = computePnL([
      e('SALE', 100_000, new Date()),
      e('PURCHASE', 60_000, new Date()),
      e('EXPENSE', 10_000, new Date()),
    ]);
    expect(pnl.salesCents).toBe(100_000);
    expect(pnl.grossProfitCents).toBe(40_000);
    expect(pnl.netProfitCents).toBe(30_000);
    expect(pnl.marginPct).toBe(30);
  });

  it('returns zero margin with no sales', () => {
    expect(computePnL([e('EXPENSE', 5000, new Date())]).marginPct).toBe(0);
  });
});

describe('periodStart', () => {
  it('week starts on Monday', () => {
    // 2026-06-20 is a Saturday → week start Mon 2026-06-15
    const start = periodStart(new Date(2026, 5, 20), 'week');
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(15);
  });
  it('month starts on the 1st', () => {
    expect(periodStart(new Date(2026, 5, 20), 'month').getDate()).toBe(1);
  });
  it('year starts in January', () => {
    expect(periodStart(new Date(2026, 5, 20), 'year').getMonth()).toBe(0);
  });
});

describe('reconcile', () => {
  const ref = new Date(2026, 5, 20, 12, 0, 0); // Sat
  const entries: LedgerEntry[] = [
    e('SALE', 50_000, new Date(2026, 5, 20, 9)), // today
    e('SALE', 30_000, new Date(2026, 5, 16, 9)), // this week, not today
    e('SALE', 20_000, new Date(2026, 4, 2, 9)), // last month
  ];

  it('day only includes today', () => {
    expect(reconcile(entries, 'day', ref).salesCents).toBe(50_000);
  });
  it('week includes Mon–Sun of this week', () => {
    expect(reconcile(entries, 'week', ref).salesCents).toBe(80_000);
  });
  it('year includes everything in 2026', () => {
    expect(reconcile(entries, 'year', ref).salesCents).toBe(100_000);
  });
});

describe('classifyStock & alerts', () => {
  const items: StockItem[] = [
    { id: '1', name: 'Cooking oil', quantity: 40, reorderLevel: 10, soldInWindow: 214 },
    { id: '2', name: 'Sugar', quantity: 2, reorderLevel: 10, soldInWindow: 42 },
    { id: '3', name: 'Shoe polish', quantity: 30, reorderLevel: 5, soldInWindow: 0 },
  ];
  const insights = classifyStock(items);

  it('flags fast / dead movement', () => {
    expect(insights[0]!.movement).toBe('fast');
    expect(insights[2]!.movement).toBe('dead');
  });
  it('marks reorder + critical correctly', () => {
    const sugar = insights[1]!;
    expect(sugar.needsReorder).toBe(true);
    expect(sugar.critical).toBe(true); // 2 <= floor(10/2)=5
  });
  it('reorderAlerts puts critical items first', () => {
    const alerts = reorderAlerts(insights);
    expect(alerts[0]!.name).toBe('Sugar');
  });
});

describe('financialSuggestions', () => {
  it('warns on a loss and dead stock', () => {
    const pnl = computePnL([
      e('SALE', 100_000, new Date()),
      e('PURCHASE', 90_000, new Date()),
      e('EXPENSE', 30_000, new Date()),
    ]);
    const stock = classifyStock([
      { id: '1', name: 'Old shirts', quantity: 50, reorderLevel: 5, soldInWindow: 0 },
    ]);
    const tips = financialSuggestions(pnl, stock);
    expect(tips.some((t) => /loss/i.test(t))).toBe(true);
    expect(tips.some((t) => /dead stock/i.test(t))).toBe(true);
  });

  it('reports healthy when all good', () => {
    const pnl = computePnL([
      e('SALE', 100_000, new Date()),
      e('PURCHASE', 50_000, new Date()),
    ]);
    const tips = financialSuggestions(pnl, []);
    expect(tips[0]).toMatch(/healthy/i);
  });
});
