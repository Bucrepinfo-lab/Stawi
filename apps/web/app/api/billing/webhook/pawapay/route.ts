import { NextResponse } from 'next/server';
import { pawapayCallbackDepositId, pawapayCheck, pawapayOn } from '@/lib/local-providers';

export const runtime = 'nodejs';

/**
 * pawaPay deposit callback for a Stawi plan payment. Never trusted on its own:
 * the deposit is re-read from pawaPay, and only a full, successful payment in
 * the right currency extends the group's plan, once. Public (Paddle/Stripe
 * share the /api/billing/webhook prefix in the middleware list).
 */
export async function POST(req: Request) {
  if (!pawapayOn(process.env)) return NextResponse.json({ error: 'not enabled' }, { status: 404 });
  const depositId = pawapayCallbackDepositId(await req.text());
  if (!depositId || !process.env.DATABASE_URL) return NextResponse.json({ ok: true, ignored: true });
  const checked = await pawapayCheck({ env: process.env, depositId });
  if (checked.status === 'pending' || checked.status === 'unknown') return NextResponse.json({ ok: true, pending: true });
  const { prisma, settlePlanPayment } = await import('@stawi/db');
  const outcome = await settlePlanPayment(prisma, {
    checkoutRequestId: depositId,
    ok: checked.status === 'success',
    paidKes: checked.amount ?? undefined,
    paidCurrency: checked.currency,
    provider: 'pawapay',
  });
  return NextResponse.json({ ok: true, outcome });
}
