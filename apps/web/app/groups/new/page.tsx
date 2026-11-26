import { NewGroupForm } from './NewGroupForm';
import { OpenDoor } from '@/components/OpenDoor';
import { saccoPlusEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

/**
 * Start a group or a business. Open to anyone signed in (owner 20/11/26): a
 * person does not have to come from a registered group, and a business can
 * open the books on their own. The server caps how many one person may start.
 */
export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const { start } = await searchParams;
  return (
    <main className="pillar-1" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 90px' }}>
      <a href="/dashboard" className="back-link no-print">← Back</a>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 30, marginTop: 14 }}>Start with what you need</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>A group, or a business on its own. The first month is free.</p>
      <NewGroupForm initialStart={start} />
      <OpenDoor savingsCredit={saccoPlusEnabled()} heading={false} />
    </main>
  );
}
