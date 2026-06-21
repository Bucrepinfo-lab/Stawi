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
    // TODO(once DB live): set Subscription.status = ACTIVE + planTier + termsAcceptedAt
    // for the tenant/group identified by tenantRef.
    console.info('[stripe] subscription active for', tenantRef);
  }

  return NextResponse.json({ received: true });
}
