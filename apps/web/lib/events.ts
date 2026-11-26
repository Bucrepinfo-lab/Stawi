/**
 * In-process pub/sub for live-dashboard push (server-only).
 *
 * Server actions publish after successful writes; /api/events streams to
 * browsers over SSE. Works on any single persistent Node process (one Fly.io
 * machine). For multi-instance scale-out, swap the bus for
 * Redis pub/sub behind the same two functions — callers won't change.
 */

export interface StawiEvent {
  type: 'contribution' | 'sacco_txn' | 'loan' | 'ledger' | 'group' | 'charter' | 'meeting';
  channel: string; // 'g:<groupId>' for a group's own pages, a tenant id, or 'public' in seed mode
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

/**
 * One group's channel (audit 26/11/26): a write in a group refreshes only the
 * pages open on THAT group, not every open page in the app — fewer re-renders
 * and fewer database reads as the number of groups grows.
 */
export function groupChannel(groupId: string): string {
  return `g:${groupId}`;
}
