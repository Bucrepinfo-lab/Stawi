/**
 * Accounting engine — Pillar 3 (QuickBooks-style).
 *
 * Profit & loss from ledger entries, reconciliation across day/week/month/year,
 * and stock-movement classification (fast / slow / dead) with reorder alerts.
 * All amounts in minor units (cents). Pure & deterministic.
 */

export type EntryType = 'SALE' | 'PURCHASE' | 'EXPENSE';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  description: string;
  amountCents: number;
  occurredAt: Date;
}

export interface ProfitAndLoss {
  salesCents: number;
  costOfGoodsCents: number; // PURCHASE
  expensesCents: number; // EXPENSE
  grossProfitCents: number; // sales - cogs
  netProfitCents: number; // sales - cogs - expenses
  marginPct: number; // net / sales * 100
}

/** Compute a P&L over a set of entries. */
export function computePnL(entries: LedgerEntry[]): ProfitAndLoss {
  let sales = 0;
  let cogs = 0;
  let expenses = 0;
  for (const e of entries) {
    if (e.type === 'SALE') sales += e.amountCents;
    else if (e.type === 'PURCHASE') cogs += e.amountCents;
    else expenses += e.amountCents;
  }
  const gross = sales - cogs;
  const net = gross - expenses;
  return {
    salesCents: sales,
    costOfGoodsCents: cogs,
    expensesCents: expenses,
    grossProfitCents: gross,
    netProfitCents: net,
    marginPct: sales === 0 ? 0 : Math.round((net / sales) * 1000) / 10,
  };
}

export type Period = 'day' | 'week' | 'month' | 'year';

/** Inclusive start of the period containing `ref` (week starts Monday). */
export function periodStart(ref: Date, period: Period): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  switch (period) {
    case 'day':
      return d;
    case 'week': {
      const dow = (d.getDay() + 6) % 7; // Mon=0
      d.setDate(d.getDate() - dow);
      return d;
    }
    case 'month':
      return new Date(ref.getFullYear(), ref.getMonth(), 1);
    case 'year':
      return new Date(ref.getFullYear(), 0, 1);
  }
}

/** Filter entries to those within the period containing `ref`, then run P&L. */
export function reconcile(
  entries: LedgerEntry[],
  period: Period,
  ref: Date = new Date(),
): ProfitAndLoss {
  const start = periodStart(ref, period);
  const end = new Date(start);
  if (period === 'day') end.setDate(end.getDate() + 1);
  else if (period === 'week') end.setDate(end.getDate() + 7);
  else if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);

  const within = entries.filter((e) => e.occurredAt >= start && e.occurredAt < end);
  return computePnL(within);
}

// ─────────────────────────── Stock movement ───────────────────────────

export type Movement = 'fast' | 'slow' | 'dead';

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  /** Units sold in the analysis window (e.g. last 7 days). */
  soldInWindow: number;
  supplierName?: string;
  supplierPhone?: string;
}

export interface StockInsight extends StockItem {
  movement: Movement;
  needsReorder: boolean;
  critical: boolean;
}

/**
 * Classify stock movement. `fastThreshold` / `slowThreshold` are units sold in
 * the window. Dead = nothing sold. Reorder when quantity <= reorderLevel;
 * critical when quantity is at/below half the reorder level.
 */
export function classifyStock(
  items: StockItem[],
  opts: { fastThreshold?: number; slowThreshold?: number } = {},
): StockInsight[] {
  const fast = opts.fastThreshold ?? 50;
  const slow = opts.slowThreshold ?? 10;
  return items.map((it) => {
    let movement: Movement;
    if (it.soldInWindow === 0) movement = 'dead';
    else if (it.soldInWindow >= fast) movement = 'fast';
    else if (it.soldInWindow <= slow) movement = 'slow';
    else movement = 'fast'; // between slow and fast trends fast-ish
    return {
      ...it,
      movement,
      needsReorder: it.quantity <= it.reorderLevel,
      critical: it.quantity <= Math.floor(it.reorderLevel / 2),
    };
  });
}

/** Items needing a supplier alert, most urgent first. */
export function reorderAlerts(items: StockInsight[]): StockInsight[] {
  return items
    .filter((i) => i.needsReorder)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || a.quantity - b.quantity);
}

/**
 * Simple, rule-based financial suggestions from a P&L + stock insight set.
 * (A live build can replace this with an LLM call behind the same signature.)
 */
export function financialSuggestions(
  pnl: ProfitAndLoss,
  stock: StockInsight[],
): string[] {
  const out: string[] = [];
  if (pnl.salesCents > 0 && pnl.netProfitCents < 0) {
    out.push('Operating at a loss this period — review expenses and pricing.');
  }
  if (pnl.marginPct > 0 && pnl.marginPct < 10) {
    out.push(`Thin net margin (${pnl.marginPct}%). Negotiate supplier costs or raise prices.`);
  }
  const dead = stock.filter((s) => s.movement === 'dead');
  if (dead.length) {
    out.push(`Clear dead stock: ${dead.map((s) => s.name).join(', ')}. Discount or stop restocking.`);
  }
  const fast = stock.filter((s) => s.movement === 'fast' && s.needsReorder);
  if (fast.length) {
    out.push(`Restock fast-movers before they run out: ${fast.map((s) => s.name).join(', ')}.`);
  }
  if (out.length === 0) out.push('Healthy period — margins and stock levels look stable.');
  return out;
}
