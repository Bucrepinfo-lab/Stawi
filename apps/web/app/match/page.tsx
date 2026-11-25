import { BusinessMatch } from './BusinessMatch';
import { ValueBanners } from '@/components/ValueBanners';
import { DocumentHouse } from '@/components/DocumentHouse';
import { getMyGroups } from '@/lib/data';
import { pickAllowedId } from '@stawi/core';

export const dynamic = 'force-dynamic';

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  // The papers card reads the caller's own group (from ?group=, else their first).
  const groups = await getMyGroups().catch(() => []);
  const { group } = await searchParams;
  const groupId = pickAllowedId(group, groups.map((g) => g.id));
  return (
    <main className="pillar-2" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
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
      <BusinessMatch />
      {groupId && <DocumentHouse groupId={groupId} focus="start_business" />}
      <ValueBanners pillars={[2]} startCollapsed />
    </main>
  );
}
