'use client';

import { useState } from 'react';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { TableBanking } from './TableBanking';
import type { GroupAccount } from '@/lib/groups';
import { setUrlParams } from '@/lib/url-state';
import { PayContribution } from '@/components/PayContribution';
import { TabsHint } from '@/components/TabsHint';
import { booksOnly, type GroupModules } from '@stawi/core';

export function DashboardClient({ groups, initialId, modulesById = {} }: { groups: GroupAccount[]; initialId?: string; modulesById?: Record<string, GroupModules> }) {
  const [activeId, setActiveIdState] = useState(initialId || groups[0]?.id || '');
  const setActiveId = (id: string) => { setActiveIdState(id); setUrlParams({ group: id }); };
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  if (!active) {
    return (
      <div className="s-card" style={{ marginTop: 28, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' }}>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 26 }}>Welcome to Stawi</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>You are not in a group yet. Start a group, or open the books for your own business. Use only what you need.</p>
        <a href="/groups/new" className="house-go" style={{ marginTop: 14 }}>Start with what you need</a>
      </div>
    );
  }
  // Only the sections this group has switched on.
  const mods = modulesById[active.id];
  const showMoney = mods?.money ?? true;
  const onlyBooks = mods ? booksOnly(mods) : false;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>
          {active.name}{showMoney ? ' · Table Banking' : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <GroupSwitcher groups={groups} activeId={activeId} onSwitch={setActiveId} />
          <a href="/account/security" style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Account</a>
          <a href="/groups/new" style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>＋ New group</a>
        </div>
      </div>

      {mods && <TabsHint records={!onlyBooks} ideas={mods.ideas} books={mods.books} messages={mods.messages} />}
      {showMoney ? (
        <>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 10 }}>
        Group capital, live
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 560 }}>
        When the treasurer records a contribution, every member&rsquo;s share recomputes
        instantly. Switch groups any time from the selector above.{' '}
        <a href="/formalize" style={{ color: 'var(--forest)', fontWeight: 600 }}>Formalize this group →</a>{' '}
        <a href={`/groups/${active.id}`} style={{ color: 'var(--forest)', fontWeight: 600 }}>Open group workspace &rarr;</a>
      </p>

      <PayContribution groupId={active.id} />

      <TableBanking key={active.id} groupId={active.id} groupName={active.name} seed={active.members} canRecord={active.myRole === 'Treasurer'} />
        </>
      ) : (
        <div className="s-card" style={{ marginTop: 18, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' }}>
          <h1 className="display" style={{ fontWeight: 600, fontSize: 28 }}>{active.name}</h1>
          <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 560 }}>
            {onlyBooks
              ? 'Your business books are ready: sales, costs, stock and what is left over.'
              : 'Your group uses Stawi for its meetings and records. No money is asked for here.'}
          </p>
          <a className="house-go" style={{ marginTop: 14 }} href={onlyBooks ? `/books?group=${encodeURIComponent(active.id)}` : `/groups/${active.id}`}>
            {onlyBooks ? 'Open the books' : 'Open the group records'}
          </a>
          <p style={{ marginTop: 12, fontSize: 13.5 }}>
            <a href={`/groups/${active.id}#choose`} style={{ color: 'var(--forest)', fontWeight: 700 }}>Choose what you use</a>
          </p>
        </div>
      )}
    </div>
  );
}
