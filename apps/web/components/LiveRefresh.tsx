'use client';

/**
 * Live-dashboard refresher. Opens an SSE connection to /api/events and calls
 * router.refresh() (throttled) whenever a write lands, so server components
 * re-render with fresh data — every member sees the payment within a second.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function LiveRefresh({ channel = 'public' }: { channel?: string }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    const es = new EventSource(`/api/events?channel=${encodeURIComponent(channel)}`);
    const onEvent = () => {
      const now = Date.now();
      if (now - last.current < 800) return; // throttle bursts
      last.current = now;
      router.refresh();
    };
    es.addEventListener('stawi', onEvent);
    return () => {
      es.removeEventListener('stawi', onEvent);
      es.close();
    };
  }, [channel, router]);

  return null;
}
