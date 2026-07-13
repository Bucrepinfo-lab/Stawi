import { notFound } from 'next/navigation';
import { GroupCockpit } from './GroupCockpit';
import { LiveRefresh } from '@/components/LiveRefresh';
import { getCockpit } from '@/lib/cockpit';
import { getViewerRole } from '@/lib/data';

export default async function GroupWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cockpit, role] = await Promise.all([getCockpit(id), getViewerRole()]);
  if (!cockpit) notFound();
  const canEdit = role === 'OFFICIAL' || role === 'SUPER_ADMIN';
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
        <GroupCockpit cockpit={cockpit} canEdit={canEdit} />
      </div>
    </main>
  );
}
