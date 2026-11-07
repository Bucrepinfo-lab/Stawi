import { notFound } from 'next/navigation';
import { GroupCockpit } from './GroupCockpit';
import { LiveRefresh } from '@/components/LiveRefresh';
import { getCockpit } from '@/lib/cockpit';
import { getViewerRole, dbEnabled } from '@/lib/data';
import { myGroupRole, RECORD_EDITOR_ROLES } from '@/lib/group-access';
import { saccoPlusEnabled } from '@/lib/features';

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
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 90px' }}>
      <LiveRefresh />
      <a href="/dashboard" className="no-print" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>← Dashboard</a>
      <div style={{ marginTop: 10 }}>
        <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Group workspace · Pillar 1</p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>{cockpit.groupName}</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
          Your group&rsquo;s point of record: capture your charter, minute every meeting, and Stawi turns it into
          bank-ready documents and a month-end statement that feed the rest of the platform.
        </p>
      </div>
      <div style={{ marginTop: 22 }}>
        <GroupCockpit cockpit={cockpit} canEdit={canEdit} saccoPlus={saccoPlusEnabled()} initialTab={tab} initialMonth={month} />
      </div>
    </main>
  );
}
