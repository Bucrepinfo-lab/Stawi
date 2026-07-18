/**
 * Business accounting activation pack — Pillar 3.
 *
 * The counterpart to `sacco-activation` for the business side: for *any*
 * business, this pre-packs the full accounting toolkit (double-entry ledger,
 * POS sales capture, P&L, inventory & reorder, KRA tax & levies) ready for
 * one-tap activation, distils the owner-facing **analytics metrics** that tell
 * them how the business is really doing, and links every reorder need to its
 * **supplier** — turning demand (low stock) into supply (a call/order or a
 * matched supplier) from a single source.
 *
 * Pure functions, integer minor units (cents). Reuses the existing accounting,
 * tax and matching engines rather than re-implementing any rule.
 */

import type { Industry, Venture } from './match';
import { generateVentures } from './match';
import type { LedgerEntry, StockItem, StockInsight, ProfitAndLoss } from './accounting';
import { computePnL, classifyStock, reorderAlerts, financialSuggestions } from './accounting';
import type { CountryCode, TaxLine } from './tax';
import { computeBusinessTaxes } from './tax';

export interface BusinessProfile {
  businessId: string;
  name: string;
  industry: Industry;
  countryCode?: CountryCode;
  /** VAT-registered (turnover ≥ KES 5M/yr). */
  vatRegistered?: boolean;
  /** Hotel / restaurant / catering (Tourism Levy). */
  tourismSector?: boolean;
}

/** Owner-facing KPIs — the "how is my business doing?" panel. */
export interface BusinessMetrics {
  salesCount: number;
  revenueCents: number;
  cogsCents: number;
  expensesCents: number;
  grossProfitCents: number;
  netProfitCents: number;
  grossMarginPct: number;
  netMarginPct: number;
  expenseRatioPct: number;
  averageSaleCents: number;
  inventoryUnits: number;
  distinctItems: number;
  fastMovers: number;
  deadStock: number;
  reorderCount: number;
  criticalCount: number;
  estimatedTaxCents: number;
  taxLines: TaxLine[];
  /** Rule-based, LLM-swappable advice (from the accounting engine). */
  suggestions: string[];
}

/** A pre-packed tool: always `ready` (bundled), `active` once it has data. */
export interface BusinessTool {
  id: string;
  label: string;
  ready: boolean;
  active: boolean;
  detail: string;
}

/** A demand → supply link: a reorder need wired to its supplier or a match. */
export interface SupplierLink {
  itemId: string;
  itemName: string;
  quantity: number;
  reorderLevel: number;
  critical: boolean;
  need: string;
  supplierName?: string;
  supplierPhone?: string;
  action:
    | { kind: 'order'; supplierName: string; supplierPhone: string }
    | { kind: 'find'; href: string };
}

export interface BusinessAccountingPack {
  businessId: string;
  name: string;
  industry: Industry;
  countryCode: CountryCode;
  /** Pre-packed toolkit — everything the business gets on activation. */
  tools: BusinessTool[];
  /** 0–100: share of pre-packed tools that are live with data. */
  readinessPct: number;
  metrics: BusinessMetrics;
  /** Reorder needs linked to their suppliers (one-source demand→supply). */
  supplierLinks: SupplierLink[];
  /** Supplier/partner matches from Pillar 2, seeded deterministically. */
  recommendedSuppliers: Venture[];
}

const marginPct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);

/** Tiny stable string hash → seed, so matched suppliers are reproducible. */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Distil the owner-facing analytics metrics from ledger + stock. */
export function businessMetrics(
  entries: LedgerEntry[],
  stock: StockItem[],
  profile: Pick<BusinessProfile, 'industry' | 'countryCode' | 'vatRegistered' | 'tourismSector'>,
): BusinessMetrics {
  const pnl: ProfitAndLoss = computePnL(entries);
  const salesCount = entries.filter((e) => e.type === 'SALE').length;
  const insights: StockInsight[] = classifyStock(stock);
  const alerts = reorderAlerts(insights);

  const taxLines = computeBusinessTaxes({
    country: profile.countryCode ?? 'KE',
    grossSalesCents: pnl.salesCents,
    vatRegistered: !!profile.vatRegistered,
    tourismSector: !!profile.tourismSector,
    manufacturingTurnoverCents: profile.industry === 'manufacturing' ? pnl.salesCents : undefined,
  });

  return {
    salesCount,
    revenueCents: pnl.salesCents,
    cogsCents: pnl.costOfGoodsCents,
    expensesCents: pnl.expensesCents,
    grossProfitCents: pnl.grossProfitCents,
    netProfitCents: pnl.netProfitCents,
    grossMarginPct: marginPct(pnl.grossProfitCents, pnl.salesCents),
    netMarginPct: pnl.marginPct,
    expenseRatioPct: marginPct(pnl.expensesCents, pnl.salesCents),
    averageSaleCents: salesCount === 0 ? 0 : Math.round(pnl.salesCents / salesCount),
    inventoryUnits: stock.reduce((a, s) => a + s.quantity, 0),
    distinctItems: stock.length,
    fastMovers: insights.filter((s) => s.movement === 'fast').length,
    deadStock: insights.filter((s) => s.movement === 'dead').length,
    reorderCount: alerts.length,
    criticalCount: alerts.filter((a) => a.critical).length,
    estimatedTaxCents: taxLines.reduce((a, l) => a + l.amountCents, 0),
    taxLines,
    suggestions: financialSuggestions(pnl, insights),
  };
}

/** Wire each reorder need to its supplier (or a Pillar-2 find link). */
export function supplierLinks(stock: StockItem[]): SupplierLink[] {
  const alerts = reorderAlerts(classifyStock(stock));
  return alerts.map((it) => ({
    itemId: it.id,
    itemName: it.name,
    quantity: it.quantity,
    reorderLevel: it.reorderLevel,
    critical: it.critical,
    need: `${it.critical ? 'Critical — ' : ''}reorder ${it.name}: ${it.quantity} left (level ${it.reorderLevel})`,
    supplierName: it.supplierName,
    supplierPhone: it.supplierPhone,
    action:
      it.supplierName && it.supplierPhone
        ? { kind: 'order', supplierName: it.supplierName, supplierPhone: it.supplierPhone }
        : { kind: 'find', href: '/match' },
  }));
}

/** The pre-packed toolkit; each tool is bundled (`ready`) and lights up (`active`) with data. */
export function businessTools(
  entries: LedgerEntry[],
  stock: StockItem[],
  metrics: BusinessMetrics,
): BusinessTool[] {
  const hasSupplierLinked = stock.some((s) => s.supplierName && s.supplierPhone);
  return [
    { id: 'ledger', label: 'Double-entry ledger & chart of accounts', ready: true, active: entries.length > 0, detail: `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` },
    { id: 'pos', label: 'POS sales capture', ready: true, active: metrics.salesCount > 0, detail: `${metrics.salesCount} sale${metrics.salesCount === 1 ? '' : 's'} recorded` },
    { id: 'pnl', label: 'Profit & loss reporting', ready: true, active: entries.length > 0, detail: entries.length ? `${metrics.netMarginPct}% net margin` : 'awaiting entries' },
    { id: 'inventory', label: 'Inventory & reorder alerts', ready: true, active: stock.length > 0, detail: stock.length ? `${metrics.distinctItems} items · ${metrics.reorderCount} to reorder` : 'no stock yet' },
    { id: 'tax', label: 'KRA tax & levies', ready: true, active: metrics.taxLines.length > 0, detail: metrics.taxLines.length ? `${metrics.taxLines.length} line(s) computed` : 'set VAT status to compute' },
    { id: 'suppliers', label: 'Supplier directory & demand–supply links', ready: true, active: hasSupplierLinked, detail: hasSupplierLinked ? 'suppliers linked to stock' : 'link a supplier to your items' },
  ];
}

/** Assemble the full pre-packed business accounting pack. */
export function buildBusinessPack(
  profile: BusinessProfile,
  entries: LedgerEntry[],
  stock: StockItem[] = [],
): BusinessAccountingPack {
  const metrics = businessMetrics(entries, stock, profile);
  const tools = businessTools(entries, stock, metrics);
  const activeTools = tools.filter((t) => t.active).length;

  // Supplier/partner matches from Pillar 2 — reuse capital as the sizing input,
  // falling back to a sensible floor so discovery works even with no revenue.
  const capitalCents = Math.max(metrics.revenueCents, 5_000_00);
  const recommendedSuppliers = generateVentures({
    industry: profile.industry,
    capitalCents,
    count: 3,
    seed: seedFrom(profile.businessId || profile.name),
  });

  return {
    businessId: profile.businessId,
    name: profile.name,
    industry: profile.industry,
    countryCode: profile.countryCode ?? 'KE',
    tools,
    readinessPct: tools.length ? Math.round((activeTools / tools.length) * 100) : 0,
    metrics,
    supplierLinks: supplierLinks(stock),
    recommendedSuppliers,
  };
}

/** True once every pre-packed tool is live with data. */
export function isBusinessPackFullyActive(pack: BusinessAccountingPack): boolean {
  return pack.readinessPct === 100;
}
