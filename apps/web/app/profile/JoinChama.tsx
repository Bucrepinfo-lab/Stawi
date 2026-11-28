'use client';

import { useState } from 'react';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';

/** "Join another chama" (owner 26/11/26): one phone number, many chamas. */
export function JoinChama() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  return (
    <section className="pf-card" id="join" aria-labelledby="pf-join">
      <h2 id="pf-join">Join another chama</h2>
      <p className="mr-meta">
        In more than one chama? Use the same phone number and Stawi PIN for all of them. Ask the new chama&rsquo;s chairperson, secretary or treasurer to add your number and give you its joining code, then type it here.
      </p>
      <form
        className="pf-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const res = await fetch('/api/auth/join-more', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
          const data = (res ? await res.json().catch(() => ({})) : {}) as { ok?: boolean; error?: string; groupId?: string | null; groupName?: string | null };
          setBusy(false);
          if (!res?.ok || !data.ok) { setFeedback({ tone: 'error', title: 'Not joined', detail: data.error ?? 'Check your connection and try again.' }); return; }
          setCode('');
          setFeedback({ tone: 'success', title: `You are in ${data.groupName ?? 'the chama'}`, detail: 'It is now in "Switch chama" on your home screen. Opening it…' });
          setTimeout(() => window.location.assign(data.groupId ? `/dashboard?group=${encodeURIComponent(data.groupId)}` : '/dashboard'), 1500);
        }}
      >
        <input className="mr-input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="482913" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 7))} aria-label="Joining code" required />
        <button type="submit" className="mr-btn go" disabled={busy || code.replace(/\D/g, '').length < 6}>{busy ? 'Checking…' : 'Join this chama'}</button>
      </form>
      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    </section>
  );
}
