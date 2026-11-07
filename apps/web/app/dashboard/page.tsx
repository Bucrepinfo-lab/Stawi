import { DashboardClient } from './DashboardClient';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MomentsStrip } from '@/components/MomentsStrip';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { getMyGroups } from '@/lib/data';
import { pickAllowedId } from '@stawi/core';
import { saccoPlusEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

// Loads the signed-in member's groups from the data provider (DB if configured,
// else seed). Auth is enforced by middleware.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const groups = await getMyGroups();
  // The selected group lives in the URL (?group=) so a refresh or shared link keeps it;
  // only one of the caller's own groups can be selected.
  const { group } = await searchParams;
  const activeId = pickAllowedId(group, groups.map((g) => g.id));
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <LiveRefresh />
      <DashboardClient groups={groups} initialId={activeId} />
      {/* SACCO+ marketing (interest, loan tiers) only when the flag is on. */}
      {saccoPlusEnabled() && <MomentsStrip />}
      {saccoPlusEnabled() && <SaccoActivationCard />}
    </main>
  );
}
