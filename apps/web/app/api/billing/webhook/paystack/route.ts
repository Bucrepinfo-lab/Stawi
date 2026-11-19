import { NextResponse } from 'next/server';
import { paystackEventReference, paystackOn, paystackVerify, verifyPaystackSignature } from '@/lib/local-providers';

export const runtime = 'nodejs';

/**
 * Paystack webhook for a Stawi plan payment (bank transfer, USSD, EFT). Signed
 * with HMAC-SHA512 of the raw body; the transaction is then re-verified with
 * Paystack, and only a full, successful payment extends the plan, once.
 */
export async function POST(req: Request) {
  if (!paystackOn(process.env)) return NextResponse.json({ error: 'not enabled' }, { status: 404 });
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get('x-paystack-signature'), (process.env.PAYSTACK_SECRET_KEY ?? '').trim())) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  const reference = paystackEventReference(raw);
  if (!reference || !process.env.DATABASE_URL) return NextResponse.json({ ok: true, ignored: true });
  const checked = await paystackVerify({ env: process.env, reference });
  if (checked.status === 'pending' || checked.status === 'unknown') return NextResponse.json({ ok: true, pending: true });
  const { prisma, settlePlanPayment } = await import('@stawi/db');
  const outcome = await settlePlanPayment(prisma, {
    checkoutRequestId: reference,
    ok: checked.status === 'success',
    paidKes: checked.amount ?? undefined,
    paidCurrency: checked.currency,
    provider: 'paystack',
  });
  return NextResponse.json({ ok: true, outcome });
}
