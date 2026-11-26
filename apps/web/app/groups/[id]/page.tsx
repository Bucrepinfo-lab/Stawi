import { notFound } from 'next/navigation';
import { GroupCockpit } from './GroupCockpit';
import { LiveRefresh } from '@/components/LiveRefresh';
import { getCockpit } from '@/lib/cockpit';
import { getViewerRole, dbEnabled } from '@/lib/data';
import { myGroupRole, myMembershipIds, RECORD_EDITOR_ROLES } from '@/lib/group-access';
import { saccoPlusEnabled } from '@/lib/features';
import { AttentionCard } from '@/components/AttentionCard';
import { groupAttention } from '@/lib/attention';
import { DocumentHouse } from '@/components/DocumentHouse';
import { MoneySummary } from '@/components/MoneySummary';
import { MoneyTrustCard } from '@/components/MoneyTrustCard';
import { AlertsCard } from '@/components/AlertsCard';
import { MyNameCard } from '@/components/MyNameCard';
import { isPlaceholderName } from '@stawi/core';
import { ModuleSwitches } from '@/components/ModuleSwitches';
import { TabsHint } from '@/components/TabsHint';
import { getGroupModules } from '@/lib/modules';
import { booksOnly, offeredModules } from '@stawi/core';
import { WriteForMeLink } from '@/components/WriteForMeLink';

export default async function GroupWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; month?: string }> }) {
  const { id } = await params;
  const { tab, month } = await searchParams;
  const [viewer, groupRole] = await Promise.all([getViewerRole(), myGroupRole(id)]);
  // DB mode: only members of THIS group (or a super-admin) may open it — 404 otherwise.
  if (dbEnabled() && !groupRole && viewer !== 'SUPER_ADMIN') notFound();
  const cockpit = await getCockpit(id);
  if (!cockpit) notFound();
  const canEdit = dbEnabled()
    ? viewer === 'SUPER_ADMIN' || (!!groupRole && RECORD_EDITOR_ROLES.has(groupRole))
    : viewer === 'OFFICIAL' || viewer === 'SUPER_ADMIN';
  // Flow & escalation: only this viewer's own duties and what has climbed to them (decided here, on the server).
  // Which sections this group uses (owner 20/11/26). Applied here, on the server.
  const modules = await getGroupModules(id);
  const attention = await groupAttention(cockpit, viewer, modules);
  // The name this member shows in the group (owner 26/11/26), editable by them.
  const myIds = dbEnabled() ? await myMembershipIds(id) : [];
  const myName = myIds.length
    ? (await (await import('@stawi/db')).prisma.membership.findFirst({ where: { id: { in: myIds } }, select: { fullName: true } }))?.fullName ?? null
    : null;
  // Money record alerts (owner 26/11/26): this member's tasks and overdue witnesses.
  const moneyAlerts = dbEnabled() && modules.money
    ? await (await import('@/lib/money-trust')).moneyAlerts(id, myIds, canEdit).catch(() => null)
    : null;
  // Posts switched off: ordinary members get the member list without posts.
  const shown = modules.officials || canEdit
    ? cockpit
    : {
        ...cockpit,
        charter: { ...cockpit.charter, members: cockpit.charter.members.map((m) => ({ ...m, designation: 'Member' as const })) },
        meetings: cockpit.meetings.map((mt) => ({ ...mt, attendance: mt.attendance.map((a) => ({ ...a, designation: undefined })) })),
      };
  return (
    <main className="pillar-1" style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 90px' }}>
      <LiveRefresh />
      <a href="/dashboard" className="back-link no-print">← Dashboard</a>
      <div style={{ marginTop: 10 }}>
        <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>{booksOnly(modules) ? 'My business' : 'Group records'}</p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>{cockpit.groupName}</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
          {booksOnly(modules)
            ? 'Your business details. The books are under the Books tab. Open more sections any time below.'
            : 'Your group’s point of record. Use the sections your group has chosen; open or close others any time below.'}
        </p>
      </div>
      {myName && <MyNameCard groupId={cockpit.groupId} name={myName} placeholder={isPlaceholderName(myName)} />}
      <AttentionCard groupId={cockpit.groupId} items={attention.items} isOfficial={attention.isOfficial} />
      {dbEnabled() && <AlertsCard />}
      <WriteForMeLink groupId={cockpit.groupId} />
      {dbEnabled() && modules.money && <MoneyTrustCard groupId={cockpit.groupId} alerts={moneyAlerts} />}
      <div style={{ marginTop: 22 }}>
        <GroupCockpit cockpit={shown} canEdit={canEdit} saccoPlus={saccoPlusEnabled() && modules.savings_credit} initialTab={tab} initialMonth={month} modules={modules} />
      </div>
      {(modules.money || modules.books) && <MoneySummary groupId={cockpit.groupId} />}
      {!booksOnly(modules) && <DocumentHouse groupId={cockpit.groupId} />}
      {canEdit && <ModuleSwitches groupId={cockpit.groupId} modules={modules} offered={offeredModules({ savingsCredit: saccoPlusEnabled() }).map((m) => m.id)} />}
      <TabsHint records={!booksOnly(modules)} ideas={modules.ideas} books={modules.books} messages={modules.messages} />
    </main>
  );
}
