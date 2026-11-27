/**
 * Browser side of phone alerts (owner 26/11/26). Permission is asked ONLY from
 * a tap ("Turn on alerts"); on later visits an existing yes is re-saved so a
 * rotated subscription is picked up. Nothing here throws.
 */
export type AlertsState = 'unsupported' | 'not-ready' | 'off' | 'on' | 'blocked';

function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const timeout = <T,>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });

function supported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function serverKey(): Promise<string | null> {
  try {
    const r = await fetch('/api/push/key', { cache: 'no-store' });
    const j = (await r.json()) as { ready?: boolean; publicKey?: string | null };
    return j.ready && j.publicKey ? j.publicKey : null;
  } catch {
    return null;
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function save(sub: PushSubscription): Promise<boolean> {
  try {
    const r = await timeout(fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(sub.toJSON()) }), 10_000);
    return r.ok;
  } catch {
    return false;
  }
}

/** Re-save an existing subscription at most once a day, or at once if it changed (owner 27/11/26: fewer calls per visit). */
const SAVED_KEY = 'stawi.push.saved';
const DAY_MS = 24 * 60 * 60 * 1000;

function savedRecently(endpoint: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null') as { endpoint?: string; at?: number } | null;
    return !!raw && raw.endpoint === endpoint && typeof raw.at === 'number' && Date.now() - raw.at < DAY_MS;
  } catch {
    return false;
  }
}

function markSaved(endpoint: string): void {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify({ endpoint, at: Date.now() })); } catch { /* private mode */ }
}

/** Where this phone stands, re-saving an existing yes. Never asks. */
export async function syncAlerts(): Promise<AlertsState> {
  if (!supported()) return 'unsupported';
  const key = await serverKey();
  if (!key) return 'not-ready';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await timeout(registration(), 8_000);
    const sub = (await reg.pushManager.getSubscription()) ?? (await timeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) as BufferSource }), 15_000));
    if (savedRecently(sub.endpoint)) return 'on';
    if (!(await save(sub))) return 'off';
    markSaved(sub.endpoint);
    return 'on';
  } catch {
    return 'off';
  }
}

/** From a tap only: ask, subscribe, save. */
export async function turnOnAlerts(): Promise<AlertsState> {
  if (!supported()) return 'unsupported';
  const key = await serverKey();
  if (!key) return 'not-ready';
  try {
    const perm = Notification.permission === 'default' ? await timeout(Notification.requestPermission(), 30_000) : Notification.permission;
    if (perm === 'denied') return 'blocked';
    if (perm !== 'granted') return 'off';
    const reg = await timeout(registration(), 8_000);
    await timeout(navigator.serviceWorker.ready, 8_000);
    const sub = (await reg.pushManager.getSubscription()) ?? (await timeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) as BufferSource }), 15_000));
    if (!(await save(sub))) return 'off';
    markSaved(sub.endpoint);
    return 'on';
  } catch {
    return 'off';
  }
}
