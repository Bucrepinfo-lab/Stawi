'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Always-visible way back from a paper you print or save as PDF (owner
 * 26/11/26: "after somebody has downloaded the document, cannot move from
 * that point back to the app"). A bar fixed at the bottom of the screen —
 * never printed — and, the moment the print / Save-as-PDF screen closes, it
 * lights up: "Saved? Back to …".
 */
export function ReturnBar({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const after = () => setDone(true);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);
  return (
    <div className={`return-bar no-print${done ? ' lit' : ''}`} role={done ? 'status' : undefined}>
      {done && <span className="return-note">Saved or printed. Your paper is in your phone&rsquo;s Downloads.</span>}
      <a
        href={href}
        className="return-btn"
        onClick={(e) => { e.preventDefault(); router.push(href); }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to {label}
      </a>
    </div>
  );
}

/**
 * Anywhere else a page prints (minutes, receipts, books): once the print /
 * Save-as-PDF screen closes, offer a clear way back. Skipped on pages that
 * already carry a ReturnBar.
 */
export function PrintReturn() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const after = () => {
      if (document.querySelector('.return-bar')) return;
      setShow(true);
      clearTimeout(t);
      t = setTimeout(() => setShow(false), 20_000);
    };
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('afterprint', after); clearTimeout(t); };
  }, []);
  if (!show) return null;
  return (
    <div className="return-bar lit no-print" role="status">
      <span className="return-note">Saved or printed.</span>
      <button type="button" className="return-btn" onClick={() => { setShow(false); router.back(); }}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>
      <button type="button" className="return-x" aria-label="Close" onClick={() => setShow(false)}>✕</button>
    </div>
  );
}
