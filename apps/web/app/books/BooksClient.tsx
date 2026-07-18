'use client';

import { useMemo, useState } from 'react';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { Books } from './Books';
import type { GroupAccount } from '@/lib/groups';
import type { WebBooks } from '@/lib/data';
import type { LedgerEntry } from '@stawi/core';

interface Props {
  groups: GroupAccount[];
  booksByGroup: Record<string, WebBooks | null>;
}

export function BooksClient({ groups, booksByGroup }: Props) {
  const [activeId, setActiveId] = useState(
    groups.find((g) => booksByGroup[g.id])?.id ?? groups[0]?.id ?? '',
  );
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const business = active ? booksByGroup[active.id] : null;

  const entries: LedgerEntry[] = useMemo(() => {
    if (!business) return [];
    return business.entries.map((e, i) => ({
      id: `${activeId}-${i}`,
      type: e.type,
      description: e.description,
      amountCents: e.amountCents,
      occurredAt: new Date(e.occurredAt),
    }));
  }, [business, activeId]);

  if (!active) {
    return <p style={{ marginTop: 40, color: 'var(--dim)' }}>You are not a member of any group yet.</p>;
  }

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
            businessId={business.businessId}
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
