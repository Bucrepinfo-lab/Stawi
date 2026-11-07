'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function SecurityActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOutHere() {
    setBusy(true);
    await createSupabaseBrowserClient().auth.signOut({ scope: 'local' });
    router.replace('/sign-in');
    router.refresh();
  }

  async function signOutEverywhere() {
    if (!confirm('Sign out of all devices? Every phone will need a new SMS code to sign in.')) return;
    setBusy(true);
    await fetch('/api/auth/devices/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => null);
    router.replace('/sign-in');
    router.refresh();
  }

  const b: React.CSSProperties = { borderRadius: 12, padding: '12px 16px', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', width: '100%' };
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <button disabled={busy} onClick={signOutHere} style={{ ...b, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)' }}>
        Sign out on this phone (keep PIN)
      </button>
      <button disabled={busy} onClick={signOutEverywhere} style={{ ...b, border: 0, background: 'var(--forest-deep)', color: '#fff' }}>
        Sign out of all devices
      </button>
    </div>
  );
}
