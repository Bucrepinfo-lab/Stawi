import { notFound } from 'next/navigation';
import { SaccoStudio } from './SaccoStudio';
import { saccoPlusEnabled } from '@/lib/features';
import { LiveRefresh } from '@/components/LiveRefresh';
import { getSaccoAccountsData, getViewerRole } from '@/lib/data';

// Flag is read per request (runtime env), never baked in at build time.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Stawi' };

export default async function SaccoPage() {
  // SACCO+ is off unless SACCO_PLUS_ENABLED=true — answer 404, not just hide.
  if (!saccoPlusEnabled()) notFound();
  const accounts = await getSaccoAccountsData();
  const viewerRole = await getViewerRole();
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p
        style={{
          fontSize: 12,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--gold-deep)',
          fontWeight: 700,
        }}
      >
        Pillar 4 · Stawi SACCO+ — Savings &amp; Credit
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Save, borrow, and graduate — all digital
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 640 }}>
        No branches, no paperwork, no hidden charges. Deposits earn 10% a year,
        loans start at 1% a month on reducing balance, and the system — not a
        committee — scores every application in seconds. Built on the reasons
        others failed, so your group doesn&apos;t.
      </p>
      <LiveRefresh />
      <SaccoStudio accounts={accounts} viewerRole={viewerRole} />
    </main>
  );
}
