'use client';

import { useEffect } from 'react';

/** Registers /sw.js (installable PWA + offline page). Production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* non-fatal: the app works without the offline page */
    });
  }, []);
  return null;
}
