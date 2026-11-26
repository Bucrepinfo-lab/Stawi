import { redirect } from 'next/navigation';
import { formatMoney } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { loadProfile } from '@/lib/profile';
import { BackLink } from '@/components/BackLink';
import { ProfileClient } from './ProfileClient';
import { JoinChama } from './JoinChama';

export const dynamic = 'force-dynamic';

/**
 * My profile (owner 26/11/26): one place for everything that is mine — name,
 * photo, phone number, PIN, my payment history in every group, all my records
 * to download, and where to say something is not working.
 */
export default async function ProfilePage() {
  if (!dbEnabled()) redirect('/dashboard');
  const profile = await loadProfile();
  if (!profile) redirect('/sign-in?next=/profile');
  return (
    <main className="pillar-1" style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 90px' }}>
      <BackLink fallback="/dashboard" />
      <p className="hist-kicker">My profile</p>
      <ProfileClient initial={{ name: profile.name, phone: profile.phone, photo: profile.photo }} />

      <section className="pf-card" aria-labelledby="pf-pay">
        <h2 id="pf-pay">My chamas &amp; payments</h2>
        <p className="mr-meta">One phone number and PIN open all of them. Switch between them with &ldquo;Switch chama&rdquo; on the home screen, or open one here.</p>
        {profile.groups.length === 0 ? (
          <p className="mr-empty">You are not in a group yet. <a href="/dashboard">Join the demo chama or start one</a>.</p>
        ) : (
          <ul className="pf-groups">
            {profile.groups.map((g) => (
              <li key={g.membershipId}>
                <div>
                  <strong>{g.groupName}</strong>
                  <span className="mr-meta">{g.role} · shown as {g.nameHere} · {g.payments} payment{g.payments === 1 ? '' : 's'}</span>
                </div>
                <span className="mono pf-total">KES {formatMoney(g.totalCents)}</span>
                <a className="mr-btn go" href={`/dashboard?group=${encodeURIComponent(g.groupId)}`}>Open</a>
                <a className="mr-btn" href={`/groups/${encodeURIComponent(g.groupId)}/history`}>History &amp; download</a>
              </li>
            ))}
          </ul>
        )}
        <a className="mr-btn go pf-wide" href="/api/me/records" download>Download all my records (Excel / CSV)</a>
      </section>

      <JoinChama />

      <section className="pf-card" aria-labelledby="pf-help">
        <h2 id="pf-help">Something not working?</h2>
        <p className="mr-meta">Tell us what you tapped and what happened, with a screenshot if you can. We reply on the same day.</p>
        <p className="pf-contact">
          Email: <span className="mono" style={{ userSelect: 'all' }}>telpeninfo@gmail.com</span>{' '}
          <a className="mr-btn" href="mailto:telpeninfo@gmail.com?subject=Stawi%20problem">Write an email</a>
        </p>
        <p className="mr-meta">Find writing hard? <a href="/write?kind=complaint">Photo your note and Stawi writes the report for you</a>.</p>
      </section>

      <section className="pf-card" aria-labelledby="pf-acc">
        <h2 id="pf-acc">Sign-in &amp; account</h2>
        <div className="mr-actions">
          <a className="mr-btn" href="/account/security">Phones I am signed in on</a>
          <a className="mr-btn stop" href="/account/delete">Delete my account</a>
        </div>
      </section>
    </main>
  );
}
