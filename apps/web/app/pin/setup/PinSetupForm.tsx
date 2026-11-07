'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid #cbd3c9', background: '#fff',
  padding: '13px 14px', fontSize: 22, textAlign: 'center', letterSpacing: '0.6em', fontWeight: 600, outline: 'none',
};
const btn: React.CSSProperties = {
  width: '100%', borderRadius: 12, border: 0, padding: '13px 16px', fontSize: 16, fontWeight: 600, color: '#fff',
  background: 'var(--forest-deep)', cursor: 'pointer',
};

export function PinSetupForm({ next, canSkip }: { next: string; canSkip: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin !== confirm) return setError('The two PINs do not match.');
    setLoading(true);
    const res = await fetch('/api/auth/pin/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setLoading(false);
    if (!res?.ok) return setError(data.error ?? 'Could not save your PIN. Try again.');
    router.replace(next);
    router.refresh();
  }

  async function skip() {
    const res = await fetch('/api/auth/pin/skip', { method: 'POST' }).catch(() => null);
    if (res?.ok) { router.replace(next); router.refresh(); }
  }

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
      <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>
        New PIN
        <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin}
          onChange={(e) => setPin(digits(e.target.value))} style={{ ...input, marginTop: 6 }} autoFocus />
      </label>
      <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>
        Repeat PIN
        <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={confirm}
          onChange={(e) => setConfirm(digits(e.target.value))} style={{ ...input, marginTop: 6 }} />
      </label>
      {error && <p style={{ fontSize: 13.5, color: '#b3261e', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading || pin.length < 4 || confirm.length < 4}
        style={{ ...btn, opacity: loading || pin.length < 4 || confirm.length < 4 ? 0.6 : 1 }}>
        {loading ? 'Saving…' : 'Save PIN'}
      </button>
      {canSkip && (
        <button type="button" onClick={skip} style={{ background: 'none', border: 0, color: 'var(--ink-2)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
          Skip for the demo account
        </button>
      )}
    </form>
  );
}
