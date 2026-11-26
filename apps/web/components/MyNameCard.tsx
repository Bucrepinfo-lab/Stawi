'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyNameAction } from '@/app/actions';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';

/**
 * "Your name in this group" (owner 26/11/26). Opens by itself while the name is
 * still the placeholder ("Group founder"); otherwise a small Change link.
 */
export function MyNameCard({ groupId, name, placeholder }: { groupId: string; name: string; placeholder: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(placeholder);
  const [value, setValue] = useState(placeholder ? '' : name);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await updateMyNameAction({ groupId, name: value }).catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' } as { ok: boolean; error?: string; name?: string }));
    setBusy(false);
    if (!res.ok) { setFeedback({ tone: 'error', title: 'Name not saved', detail: res.error }); return; }
    setFeedback({ tone: 'success', title: 'Name saved', detail: `Your group now sees you as ${res.name}.` });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className={placeholder ? 'mr-task' : undefined} style={{ marginTop: 14, display: 'grid', gap: 8 }}>
      {!open ? (
        <div className="mr-row" style={{ justifyContent: 'flex-start' }}>
          <span className="mr-meta">You appear in this group as <strong style={{ color: 'var(--ink)' }}>{name}</strong>.</span>
          <button type="button" className="mr-btn" style={{ minHeight: 32 }} onClick={() => { setValue(name); setOpen(true); }}>Change</button>
        </div>
      ) : (
        <form onSubmit={save} style={{ display: 'grid', gap: 8 }}>
          <label>
            <strong>{placeholder ? 'Add your name' : 'Your name in this group'}</strong>
            <span className="mr-meta" style={{ display: 'block' }}>{placeholder ? 'Members see you as “Group founder”. Write the name they know you by.' : 'Members see this name on the roster, receipts and messages.'}</span>
            <input className="mr-input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoComplete="name" placeholder="e.g. Fredrick Gathii" required />
          </label>
          <div className="mr-actions">
            {!placeholder && <button type="button" className="mr-btn" onClick={() => setOpen(false)}>Cancel</button>}
            <button type="submit" className="mr-btn go" disabled={busy}>{busy ? 'Saving…' : 'Save my name'}</button>
          </div>
        </form>
      )}
      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
