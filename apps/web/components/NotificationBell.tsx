'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppNotification, Severity } from '@stawi/core';

const SEV_COLOR: Record<Severity, string> = {
  info: 'var(--sky)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = seen ? 0 : notifications.length;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen((o) => !o); setSeen(true); }}
        aria-label="Notifications"
        style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer', fontSize: 18, boxShadow: 'var(--shadow)' }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 320, maxHeight: 420, overflowY: 'auto', zIndex: 40, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow)', padding: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--faint)', padding: '8px 10px' }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '16px 10px', color: 'var(--dim)', fontSize: 13 }}>You&rsquo;re all caught up.</div>
          ) : (
            notifications.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px', borderRadius: 10, borderLeft: `3px solid ${SEV_COLOR[n.severity]}`, background: 'var(--bone)', marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{n.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(n.atISO)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{n.body}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
