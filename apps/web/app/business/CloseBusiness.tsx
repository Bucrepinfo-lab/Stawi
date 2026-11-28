'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { closeBusinessAction, reopenBusinessAction } from './actions';

/** Close the business (owner 28/11/26): type its name to confirm. Nothing is deleted; it can be reopened. */
export function CloseBusiness({ groupId, name }: { groupId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function close() {
    if (busy) return;
    setBusy(true); setErr(null);
    const res = await closeBusinessAction({ groupId, typedName: typed }).catch(() => ({ ok: false, error: 'Not closed. Check your connection.' }));
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? 'Not closed.'); return; }
    router.push('/business');
    router.refresh();
  }
  return (
    <div className="bk-sheet cb-zone">
      <h3>Close this business</h3>
      <p className="bk-note">For a business you no longer run, or one opened by mistake. It leaves your lists and reminders. Nothing is deleted: the books stay, and you can reopen it from the Business page.</p>
      {!open ? (
        <button type="button" className="ro-btn danger" onClick={() => setOpen(true)}>Close this business</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void close(); }} className="cb-form">
          <label className="bk-field"><span>Type <b>{name}</b> to confirm</span><input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></label>
          {err && <p className="bk-error" role="alert">{err}</p>}
          <div className="bk-actions">
            <button type="submit" className="ro-btn danger solid" disabled={busy || !typed.trim()}>{busy ? 'Closing…' : 'Close it'}</button>
            <button type="button" className="ro-btn" onClick={() => { setOpen(false); setTyped(''); setErr(null); }}>Keep it open</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** The owner's closed businesses, each with Reopen. */
export function ClosedBusinesses({ list }: { list: { groupId: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!list.length) return null;
  async function reopen(groupId: string) {
    setBusy(groupId); setErr(null);
    const res = await reopenBusinessAction({ groupId }).catch(() => ({ ok: false, error: 'Not reopened. Try again.' }));
    setBusy(null);
    if (!res.ok) { setErr(res.error ?? 'Not reopened.'); return; }
    router.push(`/business?group=${encodeURIComponent(groupId)}`);
    router.refresh();
  }
  return (
    <details className="bk-block cb-closed">
      <summary>Closed businesses ({list.length})</summary>
      <ul className="bk-staff">
        {list.map((b) => (
          <li key={b.groupId}>
            <div><strong>{b.name}</strong><small>Closed. The books are kept.</small></div>
            <div className="bk-owed-act"><button type="button" className="bk-chip" disabled={busy === b.groupId} onClick={() => void reopen(b.groupId)}>Reopen</button></div>
          </li>
        ))}
      </ul>
      {err && <p className="bk-error">{err}</p>}
    </details>
  );
}
