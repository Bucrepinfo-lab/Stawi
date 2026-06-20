'use client';

import { useMemo, useState } from 'react';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { Books } from './Books';
import { MY_GROUPS } from '@/lib/groups';
import { GROUP_BUSINESS } from '@/lib/books';
import type { LedgerEntry } from '@stawi/core';

export function BooksClient() {
  const groups = MY_GROUPS;
  const [activeId, setActiveId] = useState(
    // Default to the first group that actually has a business.
    groups.find((g) => GROUP_BUSINESS[g.id])?.id ?? groups[0]?.id ?? '',
  );
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const business = active ? GROUP_BUSINESS[active.id] : null;

  // Build real Date objects from the day offsets (client-side).
  const entries: LedgerEntry[] = useMemo(() => {
    if (!business) return [];
    const now = Date.now();
    return business.entries.map((e, i) => ({
      id: `${activeId}-${i}`,
      type: e.type,
      description: e.description,
      amountCents: e.amountCents,
      occurredAt: new Date(now - e.dayOffset * 86_400_000),
    }));
  }, [business, activeId]);

  if (!active) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>
          Pillar 3 · Accounting
        </p>
        <GroupSwitcher groups={groups} activeId={activeId} onSwitch={setActiveId} />
      </div>

      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 10 }}>
        {business ? `${business.name} · the books` : `${active.name} · the books`}
      </h1>

      {business ? (
        <>
          <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
            Daily P&amp;L that auto-reconciles to week, month and year. Taxes and levies are
            computed automatically, stock movement is classified, and low-stock items raise
            a supplier alert.
          </p>
          <Books
            key={active.id}
            businessName={business.name}
            vatRegistered={business.vatRegistered}
            tourismSector={business.tourismSector}
            initialEntries={entries}
            stock={business.stock}
          />
        </>
      ) : (
        <div style={{ marginTop: 24, background: 'var(--paper)', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 30 }}>🌱</div>
          <h2 className="display" style={{ fontWeight: 600, fontSize: 22, marginTop: 8 }}>No business yet for {active.name}</h2>
          <p style={{ color: 'var(--ink-2)', marginTop: 8, maxWidth: 460, marginInline: 'auto' }}>
            This group hasn&rsquo;t started a business. Use the capital it raised to find one,
            then its books will appear here.
          </p>
          <a href="/match" style={{ display: 'inline-block', marginTop: 16, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '11px 20px', borderRadius: 12, textDecoration: 'none' }}>
            Find a business →
          </a>
        </div>
      )}
    </div>
  );
}
