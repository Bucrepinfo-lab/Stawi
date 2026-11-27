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
        Enter the capital your group raised and pick an industry. Stawi generates
        ventures that fit. Re-roll for fresh ideas, and save at least three to compare
        before the group decides.
      </p>
      <BusinessMatch groupId={groupId ?? null} groupCapitalCents={groupCapitalCents} groupName={groupName} />
      <p className="mr-meta" style={{ marginTop: 10 }}>
        Chosen your business and need more money than your savings? Tap <strong>Write the funding proposal</strong> on it in your shortlist, or <a href={`/proposal${groupId ? `?group=${encodeURIComponent(groupId)}` : ''}`}>write one for any business</a>.
      </p>
      {groupId && <DocumentHouse groupId={groupId} focus="start_business" />}
      <ValueBanners pillars={[2]} startCollapsed />
    </main>
  );
}
