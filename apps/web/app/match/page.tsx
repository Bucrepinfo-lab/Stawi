import { BusinessMatch } from './BusinessMatch';
import { ValueBanners } from '@/components/ValueBanners';
import { DocumentHouse } from '@/components/DocumentHouse';
import { getMyGroups } from '@/lib/data';
import { pickAllowedId } from '@stawi/core';

import { BackLink } from '@/components/BackLink';

export const dynamic = 'force-dynamic';

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  // The papers card reads the caller's own group (from ?group=, else their first).
  const groups = await getMyGroups().catch(() => []);
  const { group } = await searchParams;
  const groupId = pickAllowedId(group, groups.map((g) => g.id));
  // Start from the money the group really has (tester 27/11/26: KES 75,650 in the group, 120,000 here).
  const active = groups.find((g) => g.id === groupId);
  const groupCapitalCents = active ? active.members.reduce((t, m) => t + m.totalCents, 0) : 0;
  const groupName = active?.name ?? null;
  // A vote the group has open (owner 28/11/26): every member should see it here.
  let openVote: { id: string; voted: boolean } | null = null;
  if (groupId && process.env.DATABASE_URL) {
    const { prisma } = await import('@stawi/db');
    const { myMembershipIds } = await import('@/lib/group-access');
    const [open, mine] = await Promise.all([
      prisma.ideaShortlist.findFirst({ where: { groupId, closedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, votes: { select: { membershipId: true } } } }),
      myMembershipIds(groupId),
    ]);
    if (open) openVote = { id: open.id, voted: open.votes.some((v) => mine.includes(v.membershipId)) };
  }
  return (
    <main className="pillar-2" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <BackLink fallback="/dashboard" />
      <p
        style={{
          fontSize: 12,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--gold-deep)',
          fontWeight: 700,
        }}
      >
        Pillar 2 · Capital-to-Business Matching
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Match your capital to a venture
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 600 }}>
        Enter the money your group has and pick an industry, or tap <strong>Find our best fits</strong> to
        see the strongest ideas from every industry. Save three, then let Stawi research and rank them
        before the group decides.
      </p>
      {openVote && groupId && (
        <a
          href={`/match/compare?vote=${encodeURIComponent(openVote.id)}&group=${encodeURIComponent(groupId)}`}
          style={{ display: 'block', marginTop: 16, padding: 14, borderRadius: 14, background: 'var(--forest-deep)', color: 'var(--bone)', textDecoration: 'none' }}
        >
          <strong style={{ fontSize: 16 }}>{openVote.voted ? 'Your group is voting. You have voted.' : 'Your group is voting on its business. Vote now.'}</strong>
          <span style={{ display: 'block', fontSize: 13, opacity: 0.9, marginTop: 4 }}>See the ranked ideas, the reasons, and how members are voting.</span>
        </a>
      )}
      <BusinessMatch groupId={groupId ?? null} groupCapitalCents={groupCapitalCents} groupName={groupName} />
      <p className="mr-meta" style={{ marginTop: 10 }}>
        Chosen your business and need more money than your savings? Tap <strong>Write the funding proposal</strong> on it in your shortlist, or <a href={`/proposal${groupId ? `?group=${encodeURIComponent(groupId)}` : ''}`}>write one for any business</a>.
      </p>
      {groupId && <DocumentHouse groupId={groupId} focus="start_business" />}
      <ValueBanners pillars={[2]} startCollapsed />
    </main>
  );
}
