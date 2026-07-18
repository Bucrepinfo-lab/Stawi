import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

/**
 * POST /api/billing/webhook — Stripe events. Public (Stripe is the caller).
 * Verifies the Stripe-Signature header via HMAC-SHA256 over `${t}.${payload}`
 * (no SDK needed). On checkout.session.completed → activate the subscription.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature') ?? '';
  const payload = await req.text();

  if (secret) {
    const parts = Object.fromEntries(sig.split(',').map((kv) => kv.split('=')));
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    const ok = v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
    if (!ok) return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: { client_reference_id?: string; id?: string } } };
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ received: true }); }

  if (event.type === 'checkout.session.completed') {
    const tenantRef = event.data?.object?.client_reference_id;
    if (tenantRef && process.env.DATABASE_URL) {
      try {
        const { prisma, activateSubscriptionForTenant } = await import('@stawi/db');
        const n = await activateSubscriptionForTenant(prisma, tenantRef);
        console.info('[stripe] subscription ACTIVE for tenant', tenantRef, '-', n, 'subscription(s)');
      } catch (e) {
        console.error('[stripe] activation failed for', tenantRef, e);
      }
    } else {
      console.info('[stripe] subscription active for', tenantRef, '(no DB configured - logged only)');
    }
  }

  return NextResponse.json({ received: true });
}
