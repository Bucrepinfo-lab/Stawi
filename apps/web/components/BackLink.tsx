'use client';

import { useRouter } from 'next/navigation';

/**
 * "← Back" on every page (owner 26/11/26: "there's no back button"). Goes back
 * to where the person came from inside Stawi; when they arrived from outside
 * (a shared link, an alert, a fresh app start) it goes to `fallback` instead,
 * so Back never leaves the app.
 */
export function BackLink({ fallback = '/dashboard', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    let fromHere = false;
    try {
      fromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin && window.history.length > 1;
    } catch {
      fromHere = false;
    }
    if (fromHere) router.back();
    else router.push(fallback);
  }
  return (
    <a href={fallback} onClick={go} className="back-link no-print">
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label}
    </a>
  );
}
