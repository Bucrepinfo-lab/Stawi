import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getPlan, getCountryProfile, buildSubscriptionCheckout, quoteGroup, SMALL_GROUP_MAX_MEMBERS, planPurchasesAllowed, PLAY_APP_COOKIE, PLAY_APP_PURCHASE_UNAVAILABLE, paddleConfig, paddleSellsIn, stawiPaddleKey, STAWI_PADDLE_PRICES, type PlanTier, type CountryCode } from '@stawi/core';
import { startCheckout } from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * POST /api/billing/checkout  Body: { tier, country, period?, tenantRef? }
 * Creates a hosted checkout session (Stripe when configured) and returns its URL.
 * The price is set here on the server from group-pricing.ts (per group, in the
 * country's currency; the small-group plan pays the small-group price; a year
 * ahead = 10 months; founding price while the founding window is open).
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Play payments policy: no Stawi plan purchases inside the Play app (TWA).
  const playCookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${PLAY_APP_COOKIE}=([^;]*)`))?.[1] ?? null;
  if (!planPurchasesAllowed({ cookie: playCookie, referrer: req.headers.get('referer') })) {
    return NextResponse.json({ error: PLAY_APP_PURCHASE_UNAVAILABLE }, { status: 403 });
  }

  let body: { tier?: PlanTier; country?: string; period?: string; tenantRef?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const tier = (body.tier ?? 'STARTER') as PlanTier;
  const plan = getPlan(tier);
  if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  if (plan.billing === 'CUSTOM') {
    return NextResponse.json({ error: 'Enterprise is invoiced — contact sales.' }, { status: 400 });
  }

  const country = getCountryProfile(body.country ?? 'KE').code as CountryCode;
  const period = body.period === 'YEAR' ? 'YEAR' : 'MONTH';
  // The small-group plan is capped at 10 members, so it pays the small-group price.
  const members = tier === 'FREE' ? SMALL_GROUP_MAX_MEMBERS : SMALL_GROUP_MAX_MEMBERS + 1;
  const quote = quoteGroup({ country, members, period, env: process.env });
  const tenantRef = body.tenantRef ?? userId;

  // Owner rules 19/11/26: the most convenient local method leads where we can
  // charge it (M-Pesa in Kenya), Paddle second there and first elsewhere it
  // sells. Stawi cannot yet charge M-Pesa for the plan itself (that needs a
  // pending-plan-payment record), so where Paddle sells it is the way for now.
  // Paddle is the merchant of record and remits the tax; the card is typed
  // into Paddle, never into Stawi. Where Paddle can't sell, the rail below.
  const paddle = paddleConfig(process.env, STAWI_PADDLE_PRICES);
  // Where the price follows the number of members (Kenya, owner 20/11/26), the
  // fixed card prices would not match it: pay from the group's own row by
  // M-Pesa, which charges the group's exact price. The card returns here once a
  // per-member card price is set up in Paddle.
  // Nothing is charged here: the amount depends on the group, which this page does not know.
  if (quote.perMember) {
    return NextResponse.json({
      ok: true,
      status: 'pending',
      note: 'Your first month is free. After it, the group’s chairman or treasurer pays the group’s own price by M-Pesa from this page.',
    });
  }
  if (paddle && paddleSellsIn(country)) {
    return NextResponse.json({
      ok: true,
      card: {
        environment: paddle.environment,
        clientToken: paddle.clientToken,
        priceId: paddle.prices[stawiPaddleKey(tier === 'FREE', period)],
        customData: { tenantRef },
      },
    });
  }

  const checkout = buildSubscriptionCheckout(tier, country, quote.currency, quote.amountCents, tenantRef, period === 'YEAR' ? 'year' : 'month');
  const result = await startCheckout(checkout);

  if (result.url) return NextResponse.json({ ok: true, url: result.url, reference: result.reference });
  return NextResponse.json({
    ok: result.status !== 'failed',
    status: result.status,
    reference: result.reference,
    note: result.status === 'pending' ? 'Provider not configured yet — add its API key.' : undefined,
  });
}
