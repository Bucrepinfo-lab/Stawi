import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import {
  STAWI_PADDLE_PRICES,
  SMALL_GROUP_MAX_MEMBERS,
  paddleConfig,
  paidItemFromPaddleEvent,
  verifyPaddleSignature,
} from '@stawi/core';

export const runtime = 'nodejs';

const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

/**
 * POST /api/billing/webhook/paddle — Paddle notifications (card sales). Public
 * (Paddle is the caller; /api/billing/webhook is in the middleware list).
 * Paddle is the merchant of record for cards and handles the tax. This only
 * records a payment the buyer already made at Paddle's own checkout; it never
 * starts or moves money. Signature-checked over the raw body. Activation is
 * idempotent, so a repeated delivery changes nothing.
 */
export async function POST(req: Request) {
  const cfg = paddleConfig(process.env, STAWI_PADDLE_PRICES);
  if (!cfg) return NextResponse.json({ error: 'not enabled' }, { status: 404 });

  const raw = await req.text();
  if (!verifyPaddleSignature(raw, req.headers.get('paddle-signature'), cfg.webhookSecret, hmac)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const paid = paidItemFromPaddleEvent(event, cfg.prices, 'tenantRef');
  if (!paid) return NextResponse.json({ ok: true, ignored: true });
  if (!process.env.DATABASE_URL) {
    console.info('[paddle] paid', paid.key, 'for', paid.customId, '(no DB configured - logged only)');
    return NextResponse.json({ ok: true, logged: true });
  }

  const { prisma, activateSubscriptionForTenant } = await import('@stawi/db');
  // The small-group price only covers groups of 10 or fewer members.
  if (paid.key.startsWith('SMALL_')) {
    const groups = await prisma.group.findMany({
      where: { tenantId: paid.customId },
      select: { _count: { select: { members: true } } },
    });
    if (groups.some((group) => group._count.members > SMALL_GROUP_MAX_MEMBERS)) {
      console.error('[paddle] small-group price paid for a larger group; not applied', paid.transactionId);
      return NextResponse.json({ ok: true, ignored: 'group size' });
    }
  }

  try {
    const n = await activateSubscriptionForTenant(prisma, paid.customId);
    console.info('[paddle] subscription ACTIVE for tenant', paid.customId, '-', n, 'subscription(s)', paid.transactionId);
  } catch (e) {
    console.error('[paddle] activation failed for', paid.customId, e);
    // Non-2xx so Paddle retries.
    return NextResponse.json({ error: 'activation failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
