/**
 * In-process pub/sub for live-dashboard push (server-only).
 *
 * Server actions publish after successful writes; /api/events streams to
 * browsers over SSE. Works on any single persistent Node process (DigitalOcean
 * App Platform web service). For multi-instance scale-out, swap the bus for
 * Redis pub/sub behind the same two functions — callers won't change.
 */

export interface StawiEvent {
  type: 'contribution' | 'sacco_txn' | 'loan' | 'ledger' | 'group' | 'charter' | 'meeting';
  channel: string; // tenant id or 'public' in seed mode
  at: number;
}

type Listener = (e: StawiEvent) => void;

// Survive Next.js dev hot-reload with a global singleton.
const g = globalThis as unknown as { __stawiBus?: Set<Listener> };
const bus: Set<Listener> = (g.__stawiBus ??= new Set());

export function publishEvent(e: Omit<StawiEvent, 'at'>): void {
  const evt: StawiEvent = { ...e, at: Date.now() };
  for (const l of bus) {
    try {
      l(evt);
    } catch {
      bus.delete(l);
    }
  }
}

export function subscribe(listener: Listener): () => void {
  bus.add(listener);
  return () => bus.delete(listener);
}
