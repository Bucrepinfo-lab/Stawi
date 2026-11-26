/**
 * Web Push sending (owner 26/11/26: alerts so the app does not stay dormant).
 * Server-only. With no VAPID keys this is a quiet no-op; a send never throws,
 * so an alert can never break the write that triggered it.
 *
 * Env (Fly secrets, set by .github/workflows/push-keys.yml — never by hand):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (optional mailto:)
 */
import { createECDH } from 'node:crypto';
import webpush from 'web-push';
import type { GroupAlert } from '@stawi/core';

let configured: boolean | null = null;

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function keysMatch(publicKey: string, privateKey: string): boolean {
  try {
    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(privateKey, 'base64url'));
    return ecdh.getPublicKey().toString('base64url') === Buffer.from(publicKey, 'base64url').toString('base64url');
  } catch {
    return false;
  }
}

export function pushReady(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv || !keysMatch(pub, priv)) {
    if (pub || priv) console.error('[push] VAPID keys missing or not a pair');
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:telpeninfo@gmail.com', pub, priv);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

/** Send one alert to every saved phone of these users. Prunes dead subscriptions. */
export async function sendAlert(userIds: string[], alert: GroupAlert): Promise<{ delivered: number; subscriptions: number }> {
  const out = { delivered: 0, subscriptions: 0 };
  try {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length || !pushReady() || !process.env.DATABASE_URL) return out;
    const { prisma } = await import('@stawi/db');
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    out.subscriptions = subs.length;
    const dead: string[] = [];
    const ok: string[] = [];
    await Promise.allSettled(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: alert.title, body: alert.body, url: alert.url, tag: alert.tag }),
          { TTL: 60 * 60 * 24, urgency: 'high' },
        );
        out.delivered += 1;
        ok.push(s.id);
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.warn('[push] send failed', code ?? 'unknown');
      }
    }));
    if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    if (ok.length) await prisma.pushSubscription.updateMany({ where: { id: { in: ok } }, data: { lastUsedAt: new Date() } });
  } catch (err) {
    console.error('[push] alert failed', err instanceof Error ? err.message : err);
  }
  return out;
}
