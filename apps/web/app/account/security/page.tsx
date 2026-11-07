import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/auth';
import { currentDevice, pinFeatureEnabled } from '@/lib/pin';
import { SecurityActions } from './SecurityActions';

export const dynamic = 'force-dynamic';

/** Signed-in user's trusted devices + "sign out of all devices". */
export default async function SecurityPage() {
  const userId = await getUserId();
  if (!userId) redirect('/sign-in?next=/account/security');
  let devices: { id: string; userAgent: string | null; lastUsedAt: Date }[] = [];
  let here: string | null = null;
  if (pinFeatureEnabled()) {
    const { prisma, listTrustedDevices } = await import('@stawi/db');
    devices = await listTrustedDevices(prisma, userId);
    here = (await currentDevice())?.id ?? null;
  }
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Africa/Nairobi' });
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 80px' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>← Dashboard</Link>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 28, marginTop: 12 }}>Sign-in &amp; devices</h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 14.5 }}>
        Phones where you can sign in with your 4-digit PIN. A new phone, a forgotten PIN or 5 wrong PINs always needs an SMS code.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', display: 'grid', gap: 8 }}>
        {devices.length === 0 && <li style={{ color: 'var(--dim)', fontSize: 14 }}>No trusted devices.</li>}
        {devices.map((d) => (
          <li key={d.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', fontSize: 13.5 }}>
            <b>{d.id === here ? 'This device' : 'Another device'}</b> · last used {fmt(d.lastUsedAt)}
            <div style={{ color: 'var(--dim)', fontSize: 12, overflowWrap: 'anywhere' }}>{(d.userAgent ?? 'Unknown browser').slice(0, 90)}</div>
          </li>
        ))}
      </ul>
      <SecurityActions />
      <p style={{ marginTop: 24, fontSize: 13 }}>
        <Link href="/account/delete" style={{ color: '#b3261e' }}>Delete my account</Link>
      </p>
    </main>
  );
}
