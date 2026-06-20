'use client';

import { useState } from 'react';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { TableBanking } from './TableBanking';
import type { GroupAccount } from '@/lib/groups';

export function DashboardClient({ groups }: { groups: GroupAccount[] }) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? '');
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  if (!active) {
    return <p style={{ marginTop: 40, color: 'var(--dim)' }}>You are not a member of any group yet.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>
          {active.name} · Table Banking
        </p>
        <GroupSwitcher groups={groups} activeId={activeId} onSwitch={setActiveId} />
      </div>

      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 10 }}>
        Group capital, live
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 560 }}>
        When the treasurer records a contribution, every member&rsquo;s share recomputes
        instantly. Switch groups any time from the selector above.{' '}
        <a href="/formalize" style={{ color: 'var(--forest)', fontWeight: 600 }}>Formalize this group →</a>
      </p>

      <TableBanking key={active.id} groupId={active.id} groupName={active.name} seed={active.members} />
    </div>
  );
}
