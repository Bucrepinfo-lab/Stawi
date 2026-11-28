import { DashboardClient } from './DashboardClient';
import { MomentsStrip } from '@/components/MomentsStrip';
import { ValueBanners } from '@/components/ValueBanners';
import { ShareBar } from '@/components/ShareBar';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { getMyGroups } from '@/lib/data';
import { pickAllowedId } from '@stawi/core';
import { saccoPlusEnabled } from '@/lib/features';
import { getModulesMap } from '@/lib/modules';
import { demoGroupId } from '@/lib/demo-group';
import { splitGroups } from '@/lib/business';

export const dynamic = 'force-dynamic';

// Loads the signed-in member's groups from the data provider (DB if configured,
// else seed). Auth is enforced by middleware.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const all = await getMyGroups();
  // The selected group lives in the URL (?group=) so a refresh or shared link keeps it;
  // only one of the caller's own groups can be selected.
  const { group } = await searchParams;
  // Which sections each group uses (owner 20/11/26): the home screen shows only those.
  const modulesById = await getModulesMap(all.map((g) => g.id));
  // "My group" holds groups; a person's own business is under the Business tab (owner 28/11/26).
  const { groups, businesses } = splitGroups(all, modulesById);
  const activeId = pickAllowedId(group, groups.map((g) => g.id));
  // The shared demo chama (owner 26/11/26): one tap to join it.
  const demo = demoGroupId();
  const inDemo = !!demo && groups.some((g) => g.id === demo);
  return (
    <main className="pillar-1" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <DashboardClient groups={groups} initialId={activeId} modulesById={modulesById} demoAvailable={!!demo} inDemo={inDemo} hasBusiness={businesses.length > 0} />
      {/* No group yet: every problem we solve, the first one open (owner 26/11/26). */}
      {groups.length === 0 ? <ValueBanners pillars={[1, 2, 3, 4]} saccoPlus={saccoPlusEnabled()} /> : <ValueBanners pillars={[1]} startCollapsed />}
      <ShareBar />
      {/* SACCO+ marketing (interest, loan tiers) only when the flag is on. */}
      {saccoPlusEnabled() && <MomentsStrip />}
      {saccoPlusEnabled() && <SaccoActivationCard />}
    </main>
  );
}
