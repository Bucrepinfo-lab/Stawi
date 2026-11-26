import { notFound } from 'next/navigation';
import { dbEnabled } from '@/lib/data';
import { myGroupRole, myMembershipIds, RECORD_EDITOR_ROLES } from '@/lib/group-access';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MoneyRecord } from './MoneyRecord';

export const dynamic = 'force-dynamic';

/**
 * Money record (owner 26/11/26): every contribution, who witnessed it, whether
 * the member confirmed it, and every correction with who approved it. Open to
 * every member of THIS group, and only to them.
 */
export default async function MoneyRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbEnabled()) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
        <h1 className="display">Money record</h1>
        <p className="mr-empty">The money record opens when your group&rsquo;s live records are connected.</p>
      </main>
    );
  }
  const [mine, role] = await Promise.all([myMembershipIds(id), myGroupRole(id)]);
  if (mine.length === 0) notFound();
  const { prisma } = await import('@stawi/db');
  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } });
  if (!group) notFound();
  const { loadMoneyRecord } = await import('@/lib/money-trust');
  const data = await loadMoneyRecord(id);
  return (
    <main className="pillar-1" style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 90px' }}>
      <LiveRefresh />
      <a href={`/groups/${id}`} className="back-link no-print">← {group.name}</a>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginTop: 12 }}>Open to every member</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>Money record</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Every shilling written in, who saw it handed over, and every correction with the names of those who approved it.
      </p>
      <a href={`/groups/${encodeURIComponent(id)}/history`} className="mr-btn go" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 12, textDecoration: 'none' }}>My payment history — print or download</a>
      <MoneyRecord
        groupId={id}
        myIds={mine}
        isOfficial={!!role && RECORD_EDITOR_ROLES.has(role)}
        entries={data.entries}
        corrections={data.corrections}
      />
    </main>
  );
}
