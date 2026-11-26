'use client';

import { useState } from 'react';
import { AlertsCard } from '@/components/AlertsCard';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { TableBanking } from './TableBanking';
import type { GroupAccount } from '@/lib/groups';
import { setUrlParams } from '@/lib/url-state';
import { PayContribution } from '@/components/PayContribution';
import { TabsHint } from '@/components/TabsHint';
import { booksOnly, type GroupModules } from '@stawi/core';
import { DemoChamaCard } from '@/components/DemoChamaCard';
import { Picture } from '@/components/Pictures';

type Pillar = { n: 1 | 2 | 3 | 4; picture: 'moneybag' | 'handshake' | 'chart' | 'bank'; title: string; body: string; points: string[]; soon?: boolean };

const PILLARS: Pillar[] = [
  {
    n: 1, picture: 'moneybag', title: 'Your group',
    body: 'Savings groups, chamas, stokvels and table-banking circles, run in the open.',
    points: ['Every contribution seen by every member, with each share worked out', 'Minutes written for you from a few rough points', 'A step-by-step path to a registered group'],
  },
  {
    n: 2, picture: 'handshake', title: 'Business matching',
    body: 'Turn your savings into a business that has been checked before you put money in.',
    points: ['Ideas matched to your group’s money and skills', 'What it costs, what it earns, and the risks', 'Buyers and suppliers to talk to'],
  },
  {
    n: 3, picture: 'chart', title: 'Simple business books',
    body: 'Sales, stock and expenses on your phone, for a group business or your own shop.',
    points: ['Know each day if you made money', 'See which goods sell and which sleep on the shelf', 'Keep business money apart from home money'],
  },
  {
    n: 4, picture: 'bank', title: 'Savings and credit', soon: true,
    body: 'When your group is ready: savings, fair loans and dividends, like a SACCO.',
    points: ['Loans by clear rules, never by favour', 'Every member’s savings protected', 'Growing from group to cooperative'],
  },
];

/**
 * Not in any group yet (owner 26/11/26): the value of Stawi, in colourful
 * cards, for anyone anywhere. Shows only Stawi's own story: never any other
 * group's members, money or business.
 */
function Welcome({ demoAvailable }: { demoAvailable: boolean }) {
  return (
    <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
      <section className="welcome-hero">
        <p className="welcome-kicker">Save · Grow · Thrive</p>
        <h1 className="display welcome-title">Your group, growing in the open</h1>
        <p className="welcome-lead">
          We studied why savings groups break up: money nobody can account for, minutes nobody can write, papers nobody
          understands, loans given by favour. Stawi answers each one, on the phone every member already has, in your
          language.
        </p>
        <div className="welcome-actions">
          <a href="/groups/new" className="house-go">Start my group, first month free</a>
          <span className="welcome-note">Groups that join now keep their starting price for as long as they stay.</span>
        </div>
      </section>
      <div className="welcome-grid">
        {PILLARS.map((p) => (
          <article key={p.title} className={`welcome-card pillar-${p.n}`}>
            <div className="welcome-card-head">
              <span className="welcome-pic" aria-hidden><Picture name={p.picture} size={30} /></span>
              <strong>{p.title}</strong>
              {p.soon && <span className="welcome-soon">Coming soon</span>}
            </div>
            <p>{p.body}</p>
            <ul>
              {p.points.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </article>
        ))}
      </div>
      {demoAvailable && <DemoChamaCard />}
    </div>
  );
}

export function DashboardClient({ groups, initialId, modulesById = {}, demoAvailable = false, inDemo = false }: { groups: GroupAccount[]; initialId?: string; modulesById?: Record<string, GroupModules>; demoAvailable?: boolean; inDemo?: boolean }) {
  const [activeId, setActiveIdState] = useState(initialId || groups[0]?.id || '');
  const setActiveId = (id: string) => { setActiveIdState(id); setUrlParams({ group: id }); };
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  if (!active) return <Welcome demoAvailable={demoAvailable} />;
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

      <AlertsCard />
      {demoAvailable && !inDemo && <DemoChamaCard compact />}
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
      {/* Officials add members from the home screen (owner 26/11/26: "there is nowhere like add new member"). */}
      {['Chairman', 'Secretary', 'Treasurer'].includes(active.myRole) && (
        <div className="add-member">
          <a href={`/groups/${encodeURIComponent(active.id)}?tab=charter#members`} className="add-member-btn">＋ Add a member</a>
          <span>Write their name and phone, save, then give them their joining code in person or on WhatsApp.</span>
        </div>
      )}

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
