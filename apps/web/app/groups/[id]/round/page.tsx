import { notFound } from 'next/navigation';
import { dbEnabled } from '@/lib/data';
import { myGroupRole, myMembershipIds } from '@/lib/group-access';
import { LiveRefresh } from '@/components/LiveRefresh';
import { RoundBook } from './RoundBook';

export const dynamic = 'force-dynamic';

/**
 * Table banking round (owner 28/11/26): a roster every member can see. Who
 * takes the money at each meeting, how much, the day it comes back and the
 * profit. A record book only; Stawi never moves or offers money.
 */
export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbEnabled()) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
        <h1 className="display">Table banking round</h1>
        <p className="mr-empty">The round book opens when your group&rsquo;s live records are connected.</p>
      </main>
    );
  }
  const [mine, role] = await Promise.all([myMembershipIds(id), myGroupRole(id)]);
  if (mine.length === 0) notFound();
  const { prisma } = await import('@stawi/db');
  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } });
  if (!group) notFound();
  const { loadRound } = await import('@/lib/table-round');
  const data = await loadRound(id);
  return (
    <main className="pillar-1" style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 110px' }}>
      <LiveRefresh channel={`g:${id}`} />
      <a href={`/groups/${id}`} className="back-link no-print">← {group.name}</a>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginTop: 12 }}>Open to every member</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>Table banking round</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Whose turn it is, how much they took, the day it comes back, and the profit. Your group&rsquo;s own money and your own rules; Stawi only keeps the record.
      </p>
      <p style={{ marginTop: 10 }}><a href={`/groups/${id}/earnings`} style={{ fontWeight: 700, color: 'var(--forest-deep)' }}>See what the group has earned from rounds and fines</a></p>
      <RoundBook groupId={id} round={data.round} members={data.members} past={data.past} myIds={mine} canWrite={role === 'TREASURER' || role === 'CHAIRMAN'} />
    </main>
  );
}
