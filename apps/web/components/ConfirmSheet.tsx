'use client';

import { useEffect, useRef } from 'react';
import type { ContributionConfirm } from '@stawi/core';

/**
 * "Check before you record" (owner 26/11/26): reads back what was typed, the
 * amount written large, with a clear Yes and Cancel. Uses the native <dialog>
 * so focus is trapped, Esc cancels and screen readers announce it.
 */
export function ConfirmSheet({ confirm, busy, onYes, onNo }: { confirm: ContributionConfirm | null; busy?: boolean; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Older phones' browsers have no showModal: open it as a plain pinned box instead,
    // so the "Record this contribution?" check always appears (owner 26/11/26).
    if (confirm && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else { d.setAttribute('open', ''); d.classList.add('cf-fallback'); }
    }
    if (!confirm && d.open) {
      if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
      d.classList.remove('cf-fallback');
    }
  }, [confirm]);
  return (
    <dialog ref={ref} className="cf-sheet" aria-labelledby="cf-title" onCancel={(e) => { e.preventDefault(); if (!busy) onNo(); }}>
      {confirm && (
        <div className="cf-body">
          <h2 id="cf-title" className="cf-title">{confirm.title}</h2>
          <div className="cf-amount mono">{confirm.amount}</div>
          <dl className="cf-lines">
            {confirm.lines.map((l) => (
              <div key={l.label}><dt>{l.label}</dt><dd>{l.value}</dd></div>
            ))}
          </dl>
          {confirm.warning && <p className="cf-warn" role="alert">{confirm.warning}</p>}
          <div className="cf-actions">
            <button type="button" className="cf-no" onClick={onNo} disabled={busy}>{confirm.no}</button>
            <button type="button" className="cf-yes" onClick={onYes} disabled={busy} autoFocus>{busy ? 'Recording…' : confirm.yes}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
