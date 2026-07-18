import { DashboardClient } from './DashboardClient';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MomentsStrip } from '@/components/MomentsStrip';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { getMyGroups } from '@/lib/data';

// Loads the signed-in member's groups from the data provider (DB if configured,
// else seed). Auth is enforced by middleware.
export default async function DashboardPage() {
  const groups = await getMyGroups();
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <LiveRefresh />
      <DashboardClient groups={groups} />
      <MomentsStrip />
      <SaccoActivationCard />
    </main>
  );
}
