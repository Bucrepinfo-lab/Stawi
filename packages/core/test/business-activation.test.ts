import { describe, it, expect } from 'vitest';
import type { LedgerEntry, StockItem } from '../src/accounting';
import {
  buildBusinessPack,
  businessMetrics,
  supplierLinks,
  isBusinessPackFullyActive,
  type BusinessProfile,
} from '../src/business-activation';

const profile: BusinessProfile = {
  businessId: 'biz1',
  name: 'Zawadi Retail',
  industry: 'retail',
  countryCode: 'KE',
  vatRegistered: true,
};

const now = new Date('2026-07-10T09:00:00Z');
const entries: LedgerEntry[] = [
  { id: 'e1', type: 'SALE', description: 'Sale of goods', amountCents: 500_000, occurredAt: now },
  { id: 'e2', type: 'SALE', description: 'Sale of goods', amountCents: 300_000, occurredAt: now },
  { id: 'e3', type: 'PURCHASE', description: 'Stock purchase', amountCents: 400_000, occurredAt: now },
  { id: 'e4', type: 'EXPENSE', description: 'Rent', amountCents: 100_000, occurredAt: now },
];

const stock: StockItem[] = [
  { id: 's1', name: 'Sugar 2kg', quantity: 2, reorderLevel: 10, soldInWindow: 60, supplierName: 'Kabras', supplierPhone: '254700111222' },
  { id: 's2', name: 'Soap', quantity: 40, reorderLevel: 10, soldInWindow: 5 },
  { id: 's3', name: 'Old calendars', quantity: 30, reorderLevel: 5, soldInWindow: 0 },
];

describe('businessMetrics', () => {
  it('computes revenue, margins, tax and stock movement', () => {
    const m = businessMetrics(entries, stock, profile);
    expect(m.salesCount).toBe(2);
    expect(m.revenueCents).toBe(800_000);
    expect(m.cogsCents).toBe(400_000);
    expect(m.grossProfitCents).toBe(400_000);
    expect(m.netProfitCents).toBe(300_000); // 800 - 400 - 100 (×1000)
    expect(m.averageSaleCents).toBe(400_000);
    expect(m.fastMovers).toBe(1); // sugar
    expect(m.deadStock).toBe(1); // calendars
    expect(m.reorderCount).toBe(1); // sugar below level
    expect(m.criticalCount).toBe(1); // 2 <= floor(10/2)=5
    expect(m.estimatedTaxCents).toBeGreaterThan(0); // VAT registered
    expect(m.taxLines.some((l) => l.code === 'VAT')).toBe(true);
    expect(m.suggestions.length).toBeGreaterThan(0);
  });

  it('no tax lines when not VAT-registered', () => {
    const m = businessMetrics(entries, stock, { ...profile, vatRegistered: false });
    expect(m.taxLines).toHaveLength(0);
    expect(m.estimatedTaxCents).toBe(0);
  });

  it('handles an empty business without dividing by zero', () => {
    const m = businessMetrics([], [], profile);
    expect(m.revenueCents).toBe(0);
    expect(m.averageSaleCents).toBe(0);
    expect(m.netMarginPct).toBe(0);
  });
});

describe('supplierLinks', () => {
  it('links a reorder need to its known supplier as an order action', () => {
    const links = supplierLinks(stock);
    expect(links).toHaveLength(1); // only sugar needs reorder
    expect(links[0].itemName).toBe('Sugar 2kg');
    expect(links[0].action).toEqual({ kind: 'order', supplierName: 'Kabras', supplierPhone: '254700111222' });
    expect(links[0].critical).toBe(true);
  });

  it('falls back to a Pillar-2 find link when no supplier is known', () => {
    const links = supplierLinks([
      { id: 'x', name: 'Flour', quantity: 1, reorderLevel: 8, soldInWindow: 20 },
    ]);
    expect(links[0].action).toEqual({ kind: 'find', href: '/match' });
  });
});

describe('buildBusinessPack', () => {
  it('pre-packs every tool ready, lights up active ones, and links suppliers', () => {
    const pack = buildBusinessPack(profile, entries, stock);
    expect(pack.tools.every((t) => t.ready)).toBe(true); // all pre-packed
    expect(pack.tools.find((t) => t.id === 'pos')!.active).toBe(true);
    expect(pack.tools.find((t) => t.id === 'inventory')!.active).toBe(true);
    expect(pack.readinessPct).toBeGreaterThan(0);
    expect(pack.supplierLinks).toHaveLength(1);
    expect(pack.recommendedSuppliers.length).toBe(3); // Pillar-2 matches
    expect(pack.recommendedSuppliers.every((v) => v.industry === 'retail')).toBe(true);
  });

  it('is deterministic — same business yields the same supplier matches', () => {
    const a = buildBusinessPack(profile, entries, stock);
    const b = buildBusinessPack(profile, entries, stock);
    expect(a.recommendedSuppliers.map((v) => v.title)).toEqual(b.recommendedSuppliers.map((v) => v.title));
  });

  it('a fresh business is fully ready but not yet active', () => {
    const pack = buildBusinessPack(profile, [], []);
    expect(pack.tools.every((t) => t.ready)).toBe(true);
    expect(isBusinessPackFullyActive(pack)).toBe(false);
    expect(pack.readinessPct).toBeLessThan(100);
    expect(pack.recommendedSuppliers.length).toBe(3); // discovery works with no revenue
  });
});
