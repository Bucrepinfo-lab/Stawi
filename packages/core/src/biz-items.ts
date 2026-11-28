/**
 * Business items (owner 28/11/26): what is in stock, what it cost, what sells
 * fast, what is stagnating, and what is a risk — in plain words a shopkeeper
 * can act on today.
 *
 * Quantities and average cost come from the entries themselves (goods in,
 * goods sold, goods lost, counts), per branch, so the stock figure and the
 * books can never disagree. ItemMovement follows the fast / slow / non-moving
 * (FSN) method inventory managers use, with plain thresholds.
 */
import { addBizDays, bizDaysBetween, reversedIds, type BizEntry, type DayRange } from './biz-books';

export interface BizItem {
  id: string;
  name: string;
  /** e.g. piece, kg, packet, litre, plate, haircut */
  unit: string;
  /** Usual selling price, cents per unit. */
  priceCents: number;
  /** Warn when stock falls to this many (0 = no warning). */
  reorderAt: number;
  /** A service (haircut, repair) has no stock. */
  service?: boolean;
}

export interface ItemPosition {
  itemId: string;
  qty: number;
  /** Weighted average cost per unit, cents. */
  avgCostCents: number;
  valueCents: number;
  firstDay: string | null;
}

const live = (entries: BizEntry[]) => {
  const reversed = reversedIds(entries);
  return entries.filter((e) => !e.reverses && !reversed.has(e.id));
};

/**
 * Stock on hand and its average cost, up to and including `to`, for one branch
 * or the whole business. Goods in raise the average cost by weight; sales and
 * losses take goods out at the average cost.
 */
export function itemPositions(entries: BizEntry[], opts: { to?: string; branchId?: string } = {}): Map<string, ItemPosition> {
  const pos = new Map<string, ItemPosition>();
  const rows = live(entries)
    .filter((e) => e.itemId && e.qty && (!opts.to || e.day <= opts.to) && (!opts.branchId || e.branchId === opts.branchId))
    .sort((a, b) => a.day.localeCompare(b.day) || (a.recordedAt ?? '').localeCompare(b.recordedAt ?? ''));
  for (const e of rows) {
    const p = pos.get(e.itemId!) ?? { itemId: e.itemId!, qty: 0, avgCostCents: 0, valueCents: 0, firstDay: null };
    p.firstDay ??= e.day;
    const q = e.qty!;
    if (e.kind === 'STOCK_IN' || (e.kind === 'OPENING' && e.opening === 'STOCK')) {
      const value = p.valueCents + e.amountCents;
      p.qty += q;
      p.valueCents = Math.max(0, value);
      p.avgCostCents = p.qty > 0 ? Math.round(p.valueCents / p.qty) : 0;
    } else if (e.kind === 'SALE' || e.kind === 'STOCK_LOSS') {
      p.qty -= q;
      p.valueCents = Math.max(0, p.qty) * p.avgCostCents;
    }
    pos.set(e.itemId!, p);
  }
  return pos;
}

/** Cost of selling `qty` now (whole line, cents), for the server to store on a sale. */
export function costOfSale(entries: BizEntry[], itemId: string, qty: number, branchId: string, day: string): number {
  const p = itemPositions(entries, { to: day, branchId }).get(itemId);
  return Math.round((p?.avgCostCents ?? 0) * qty);
}

// ───────────────────────────── ItemMovement and risk ─────────────────────────────

export type ItemMovement = 'fast' | 'steady' | 'slow' | 'stagnant' | 'new' | 'none';
export type ItemRisk = 'red_line' | 'running_out' | 'out_of_stock' | 'below_cost' | 'thin_margin' | 'losses' | 'money_stuck';

export const ITEM_MOVEMENT_LABEL: Record<ItemMovement, { en: string; sw: string; tip: string }> = {
  fast: { en: 'Fast-going', sw: 'Inauzika haraka', tip: 'Sells on most days. Never let it run out.' },
  steady: { en: 'Steady', sw: 'Inauzika kawaida', tip: 'Sells often. Keep it stocked.' },
  slow: { en: 'Slow', sw: 'Inauzika polepole', tip: 'Sells now and then. Buy less of it each time.' },
  stagnant: { en: 'Not moving', sw: 'Haiuziki', tip: 'No sale for a long time. Sell it off at a small discount and stop restocking.' },
  new: { en: 'New', sw: 'Mpya', tip: 'Recently added. Give it two weeks before judging.' },
  none: { en: 'Not in stock', sw: 'Haipo', tip: 'Nothing in stock and nothing sold.' },
};

export const RISK_LABEL: Record<ItemRisk, { en: string; sw: string; tip: string }> = {
  red_line: { en: 'At its red line', sw: 'Imefika mstari mwekundu', tip: 'Down to the level you set. Ask your supplier now.' },
  out_of_stock: { en: 'Out of stock', sw: 'Imeisha', tip: 'Customers are asking and you have none. Restock first.' },
  running_out: { en: 'Running out', sw: 'Inakaribia kuisha', tip: 'At today’s pace it finishes in a few days. Order now.' },
  below_cost: { en: 'Sold below cost', sw: 'Inauzwa chini ya bei ya kununua', tip: 'You lose money on every one sold. Raise the price.' },
  thin_margin: { en: 'Very small profit', sw: 'Faida ndogo sana', tip: 'Under 5% profit. Check the buying price or the selling price.' },
  losses: { en: 'Many lost or damaged', sw: 'Nyingi zimepotea au kuharibika', tip: 'More than 1 in 20 is lost. Check storage, expiry and who handles it.' },
  money_stuck: { en: 'Money stuck on the shelf', sw: 'Pesa imekwama kwenye rafu', tip: 'Not selling, and money sits in it. Offer a small discount or sell it with a fast-going item, and stop restocking it.' },
};

export interface ItemInsight {
  item: BizItem;
  qty: number;
  avgCostCents: number;
  stockValueCents: number;
  unitsSold: number;
  salesCents: number;
  profitCents: number;
  marginPct: number;
  /** Share of all sales in the window, %. */
  salesSharePct: number;
  daysWithSales: number;
  lastSale: string | null;
  daysSinceSale: number | null;
  /** At the recent pace, days until stock runs out (null: no pace yet). */
  daysLeft: number | null;
  /** Units sold per day at the recent pace (last 14 days). */
  perDay: number;
  unitsLost: number;
  movement: ItemMovement;
  risks: ItemRisk[];
  /** One plain sentence: what to do about this item. */
  advice: string;
}

export interface InsightOptions {
  /** Window of days to judge movement (default 30, ending `today`). */
  windowDays?: number;
  /** No sale for this many days with stock on hand = not moving (default 30). */
  stagnantDays?: number;
  /** "Running out" when fewer than this many days of stock are left (default 4). */
  runOutDays?: number;
  branchId?: string;
}

/**
 * Every item, judged over the window ending `today`: how fast it moves, what it
 * earns, and what could go wrong. Sorted: risks first, then by sales.
 */
export function itemInsights(entries: BizEntry[], items: BizItem[], today: string, opts: InsightOptions = {}): ItemInsight[] {
  const windowDays = opts.windowDays ?? 30;
  const stagnantDays = opts.stagnantDays ?? 30;
  const runOutDays = opts.runOutDays ?? 4;
  const from = addBizDays(today, -(windowDays - 1));
  const mine = live(entries).filter((e) => !opts.branchId || e.branchId === opts.branchId);
  const positions = itemPositions(entries, { to: today, branchId: opts.branchId });
  const totalSales = mine.filter((e) => e.kind === 'SALE' && e.day >= from && e.day <= today).reduce((s, e) => s + e.amountCents, 0);

  const out = items.map((item): ItemInsight => {
    const pos = positions.get(item.id);
    const sales = mine.filter((e) => e.kind === 'SALE' && e.itemId === item.id && e.day <= today);
    const inWindow = sales.filter((e) => e.day >= from);
    const unitsSold = inWindow.reduce((s, e) => s + (e.qty ?? 0), 0);
    const salesCents = inWindow.reduce((s, e) => s + e.amountCents, 0);
    const costCents = inWindow.reduce((s, e) => s + (e.costCents ?? 0), 0);
    const profitCents = salesCents - costCents;
    const lastSale = sales.length ? sales.map((e) => e.day).sort().at(-1)! : null;
    const daysWithSales = new Set(inWindow.map((e) => e.day)).size;
    const lost = mine.filter((e) => e.kind === 'STOCK_LOSS' && e.itemId === item.id && e.day >= from && e.day <= today).reduce((s, e) => s + (e.qty ?? 0), 0);
    const qty = item.service ? 0 : Math.max(0, pos?.qty ?? 0);
    const age = pos?.firstDay ? bizDaysBetween(pos.firstDay, today) + 1 : 0;
    // Pace from the last 14 days, so a change of season shows quickly.
    const recentFrom = addBizDays(today, -13);
    const recentUnits = sales.filter((e) => e.day >= recentFrom).reduce((s, e) => s + (e.qty ?? 0), 0);
    const perDay = recentUnits / Math.min(14, Math.max(1, age || 14));
    const daysLeft = item.service || perDay <= 0 ? null : Math.floor(qty / perDay);
    const daysSinceSale = lastSale ? bizDaysBetween(lastSale, today) : null;
    const span = Math.min(windowDays, Math.max(1, age || windowDays));

    let movement: ItemMovement;
    if (!item.service && qty === 0 && unitsSold === 0) movement = 'none';
    else if (age > 0 && age < 14 && unitsSold < 3) movement = 'new';
    else if (unitsSold === 0 && (daysSinceSale === null || daysSinceSale >= stagnantDays)) movement = qty > 0 || item.service ? 'stagnant' : 'none';
    else if (daysWithSales >= span * 0.5) movement = 'fast';
    else if (daysWithSales >= span * 0.2) movement = 'steady';
    else if (daysSinceSale !== null && daysSinceSale >= stagnantDays) movement = 'stagnant';
    else movement = 'slow';

    const marginPct = salesCents === 0 ? 0 : Math.round((profitCents / salesCents) * 1000) / 10;
    const risks: ItemRisk[] = [];
    if (!item.service) {
      // The owner's own red line comes first: it is the level they chose to reorder at.
      if (item.reorderAt > 0 && qty > 0 && qty <= item.reorderAt) risks.push('red_line');
      if (qty === 0 && (movement === 'fast' || movement === 'steady' || item.reorderAt > 0)) risks.push('out_of_stock');
      else if (daysLeft !== null && daysLeft < runOutDays && (movement === 'fast' || movement === 'steady')) risks.push('running_out');
    }
    const avgCost = pos?.avgCostCents ?? 0;
    if (avgCost > 0 && item.priceCents > 0 && item.priceCents < avgCost) risks.push('below_cost');
    else if (salesCents > 0 && costCents > 0 && profitCents < 0) risks.push('below_cost');
    else if (salesCents > 0 && costCents > 0 && marginPct < 5) risks.push('thin_margin');
    if (lost > 0 && lost / Math.max(1, unitsSold + lost) > 0.05) risks.push('losses');
    if (movement === 'stagnant' && (pos?.valueCents ?? 0) >= 1_000_00) risks.push('money_stuck');

    const advice = risks.length ? RISK_LABEL[risks[0]!].tip : ITEM_MOVEMENT_LABEL[movement].tip;
    return {
      item, qty, avgCostCents: avgCost, stockValueCents: item.service ? 0 : Math.max(0, pos?.valueCents ?? 0),
      unitsSold, salesCents, profitCents, marginPct, salesSharePct: totalSales ? Math.round((salesCents / totalSales) * 1000) / 10 : 0,
      daysWithSales, lastSale, daysSinceSale, daysLeft, perDay: Math.round(perDay * 100) / 100, unitsLost: lost, movement, risks, advice,
    };
  });
  return out.sort((a, b) => b.risks.length - a.risks.length || b.salesCents - a.salesCents);
}

export interface DayHighlights {
  day: string;
  /** Busiest items today by money taken. */
  busiest: { name: string; units: number; salesCents: number }[];
  runningOut: string[];
  notMoving: { name: string; days: number; valueCents: number }[];
  belowCost: string[];
}

/** The four things a shopkeeper wants to know at the end of a day. */
export function dayHighlights(entries: BizEntry[], items: BizItem[], day: string, branchId?: string): DayHighlights {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const today = live(entries).filter((e) => e.kind === 'SALE' && e.day === day && e.itemId && (!branchId || e.branchId === branchId));
  const byItem = new Map<string, { units: number; salesCents: number }>();
  for (const e of today) {
    const cur = byItem.get(e.itemId!) ?? { units: 0, salesCents: 0 };
    cur.units += e.qty ?? 0;
    cur.salesCents += e.amountCents;
    byItem.set(e.itemId!, cur);
  }
  const insights = itemInsights(entries, items, day, { branchId });
  return {
    day,
    busiest: [...byItem.entries()].map(([id, v]) => ({ name: names.get(id) ?? 'Item', ...v })).sort((a, b) => b.salesCents - a.salesCents).slice(0, 5),
    runningOut: insights.filter((i) => i.risks.includes('red_line') || i.risks.includes('running_out') || i.risks.includes('out_of_stock')).map((i) => i.item.name),
    notMoving: insights.filter((i) => i.movement === 'stagnant' && i.qty > 0).map((i) => ({ name: i.item.name, days: i.daysSinceSale ?? 0, valueCents: i.stockValueCents })).sort((a, b) => b.valueCents - a.valueCents).slice(0, 5),
    belowCost: insights.filter((i) => i.risks.includes('below_cost')).map((i) => i.item.name),
  };
}

/** Sales for each day of a range (for a small bar chart). */
export function salesByDay(entries: BizEntry[], range: DayRange, branchId?: string): { day: string; cents: number }[] {
  const mine = live(entries).filter((e) => e.kind === 'SALE' && e.day >= range.from && e.day <= range.to && (!branchId || e.branchId === branchId));
  const out: { day: string; cents: number }[] = [];
  for (let d = range.from; d <= range.to; d = addBizDays(d, 1)) out.push({ day: d, cents: mine.filter((e) => e.day === d).reduce((s, e) => s + e.amountCents, 0) });
  return out;
}
