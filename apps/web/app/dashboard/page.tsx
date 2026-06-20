import { DashboardClient } from './DashboardClient';
import { MY_GROUPS } from '@/lib/groups';

// In production MY_GROUPS is loaded from @stawi/db for the signed-in Clerk user
// (all groups they are a member of). Auth is enforced by middleware.
export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <DashboardClient groups={MY_GROUPS} />
    </main>
  );
}
