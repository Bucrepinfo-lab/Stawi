import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlan, getCountryProfile, buildSubscriptionCheckout, type PlanTier, type CountryCode } from '@stawi/core';
import { startCheckout } from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * POST /api/billing/checkout  Body: { tier, country, tenantRef? }
 * Creates a hosted checkout session (Stripe when configured) and returns its URL.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { tier?: PlanTier; country?: string; tenantRef?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const tier = (body.tier ?? 'STARTER') as PlanTier;
  const plan = getPlan(tier);
  if (plan.monthlyUsdCents == null) {
    return NextResponse.json({ error: 'Enterprise is invoiced — contact sales.' }, { status: 400 });
  }
  if (plan.monthlyUsdCents === 0) {
    return NextResponse.json({ ok: true, free: true, message: 'Free plan — no payment needed.' });
  }

  const country = (body.country ?? 'KE') as CountryCode;
  // Charge in USD (base) for global card processing; localize display elsewhere.
  const currency = 'USD';
  void getCountryProfile(country); // validates the code

  const checkout = buildSubscriptionCheckout(tier, country, currency, plan.monthlyUsdCents, body.tenantRef ?? userId);
  const result = await startCheckout(checkout);

  if (result.url) return NextResponse.json({ ok: true, url: result.url, reference: result.reference });
  return NextResponse.json({
    ok: result.status !== 'failed',
    status: result.status,
    reference: result.reference,
    note: result.status === 'pending' ? 'Provider not configured yet — add its API key.' : undefined,
  });
}
