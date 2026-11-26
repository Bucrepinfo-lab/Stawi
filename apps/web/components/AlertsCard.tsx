'use client';

import { useEffect, useState } from 'react';
import { syncAlerts, turnOnAlerts, type AlertsState } from '@/lib/push-client';

/**
 * "Turn on alerts" (owner 26/11/26): so members hear about new messages and
 * new contributions even when the app is closed. Shown until alerts are on;
 * once on, a single quiet line.
 */
export function AlertsCard() {
  const [state, setState] = useState<AlertsState | 'checking'>('checking');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    let alive = true;
    syncAlerts().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  if (state === 'checking' || state === 'unsupported' || state === 'not-ready') return null;
  if (state === 'on') {
    return <p className="al-on" role="status"><span aria-hidden>●</span> Alerts are on for this phone: new messages and new contributions.</p>;
  }
  return (
    <section className="al-card" aria-labelledby="al-title">
      <div className="al-bell" aria-hidden>
        <svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Zm0 19a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22Z" fill="currentColor" /></svg>
      </div>
      <div className="al-text">
        <h2 id="al-title">Know the moment money comes in</h2>
        {state === 'blocked' ? (
          <p>Alerts are blocked for Stawi on this phone. Open your phone&rsquo;s <strong>Settings → Apps → Stawi → Notifications</strong> (or the lock icon beside the address in your browser) and allow them, then come back.</p>
        ) : (
          <p>Get an alert on this phone when a member posts a message or a contribution is recorded, even with Stawi closed.{tried ? ' No answer came from the phone; tap again and choose Allow.' : ''}</p>
        )}
      </div>
      {state !== 'blocked' && (
        <button
          type="button"
          className="al-btn"
          disabled={busy}
          onClick={async () => { setBusy(true); const s = await turnOnAlerts(); setBusy(false); setTried(true); setState(s); }}
        >
          {busy ? 'Turning on…' : 'Turn on alerts'}
        </button>
      )}
    </section>
  );
}
