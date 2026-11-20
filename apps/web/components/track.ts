'use client';

import type { EngagementEvent } from '@stawi/core';

/**
 * Count a view, open, tap or share. Sends only the event kind and a short key
 * (never who you are). Never throws and never blocks the page.
 */
export function track(event: EngagementEvent, key: string): void {
  try {
    const body = JSON.stringify({ event, key });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => undefined);
  } catch {
    // Counting is optional.
  }
}

/** Count something once per browser session (e.g. a banner coming into view). */
export function trackOnce(event: EngagementEvent, key: string): void {
  try {
    const id = `stawiSeen:${event}:${key}`;
    if (sessionStorage.getItem(id)) return;
    sessionStorage.setItem(id, '1');
  } catch {
    // No storage: still count.
  }
  track(event, key);
}

/** The language picked on the home page ('sw' or English for everything else). */
export function storedLang(): 'en' | 'sw' {
  try {
    return localStorage.getItem('stawiLang') === 'sw' ? 'sw' : 'en';
  } catch {
    return 'en';
  }
}
