'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinDemoGroupAction } from '@/app/actions';
import { track } from './track';
import { Picture } from './Pictures';

/**
 * "Join the Stawi Demo Chama" (owner 26/11/26): see a working chama from the
 * inside with one tap. Sample money only; you join as an ordinary member.
 */
export function DemoChamaCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function join() {
    track('cta', 'demo-chama-join');
    setError('');
    setPending(true);
    const r = await joinDemoGroupAction().catch(() => ({ ok: false, groupId: undefined, error: 'Could not join. Try again.' }));
    setPending(false);
    if (!r.ok || !r.groupId) {
      setError(r.error ?? 'Could not join. Try again.');
      return;
    }
    router.push(`/dashboard?group=${r.groupId}`);
    router.refresh();
  }

  return (
    <div className="s-card" style={{ marginTop: 18, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: compact ? 16 : 22, boxShadow: 'var(--shadow)', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Picture name="handshake" size={compact ? 30 : 40} />
        <strong style={{ fontSize: compact ? 16 : 19 }}>See a working savings group from the inside</strong>
      </div>
      {!compact && (
        <p style={{ color: 'var(--ink-2)', margin: 0 }}>
          Join the <b>Stawi Demo Chama</b>, a practice group made by Stawi for everyone trying the app. Watch contributions
          add up, see each member&rsquo;s share, read the minutes and the messages, exactly as your own group would. The money
          in it is sample money, you join as an ordinary member, and other members only see you as &ldquo;Tester&rdquo; with
          three digits, never your phone number. Real groups stay private: nobody outside a group ever sees its members,
          money or business.
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="share-btn primary" onClick={() => void join()} disabled={pending}>
          {pending ? 'Joining…' : 'Join the demo chama'}
        </button>
        {!compact && <a href="/groups/new" className="share-btn">Start my own group, first month free</a>}
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#b3261e', fontSize: 13.5 }}>{error}</p>}
    </div>
  );
}
