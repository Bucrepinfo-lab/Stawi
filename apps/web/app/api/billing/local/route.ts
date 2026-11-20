import { NextResponse } from 'next/server';
import {
  PLAN_PAYER_ROLES,
  PLAY_APP_COOKIE,
  PLAY_APP_PURCHASE_UNAVAILABLE,
  SMALL_GROUP_MAX_MEMBERS,
  STAWI_PADDLE_PRICES,
  getPlan,
  localMethodFor,
  paddleConfig,
  planPurchasesAllowed,
  quoteGroup,
  subscriptionRails,
  type PlanTier,
} from '@stawi/core';
import { getLoginPhone, getSupabaseUser, getUserId, getUserPhone } from '@/lib/auth';
import { groupRoleFor } from '@/lib/group-access';
import { initiateStkPush, darajaConfig, MpesaConfigError } from '@/lib/mpesa';
import { pawapayDeposit, pawapayOn, paystackInitialize, paystackOn } from '@/lib/local-providers';

export const runtime = 'nodejs';

function playAppBlocked(req: Request): boolean {
  const cookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${PLAY_APP_COOKIE}=([^;]*)`))?.[1] ?? null;
  return !planPurchasesAllowed({ cookie, referrer: req.headers.get('referer') });
}

function mpesaReady(): boolean {
  try {
    darajaConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * The way most people in a group's country pay, when it is open: its provider
 * is on and the group price for that country is approved (owner standing
 * order 19/11/26: it leads; the card comes later, through Paddle).
 */
function localRailFor(countryCode: string, members: number) {
  const local = localMethodFor(countryCode);
  if (!local) return null;
  const quote = quoteGroup({ country: countryCode, members, period: 'MONTH', env: process.env });
  const rails = subscriptionRails({
    country: countryCode,
    switches: {
      mpesa: mpesaReady(),
      pawapay: pawapayOn(process.env),
      paystack: paystackOn(process.env),
      paddle: paddleConfig(process.env, STAWI_PADDLE_PRICES) !== null,
    },
    localPriceApproved: quote.approved && quote.currency === local.currency,
  });
  const lead = rails.find((rail) => rail !== 'PADDLE');
  return lead ? { rail: lead, label: local.label, currency: local.currency } : null;
}

/**
 * GET /api/billing/local — the groups the signed-in person may pay the plan
 * for (chairman or treasurer), each with the local way open in its country.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ groups: [] });
  const phone = await getUserPhone().catch(() => null);
  const { prisma } = await import('@stawi/db');
  const key = phone ? phone.replace(/\D/g, '').slice(-9) : '';
  const rows = await prisma.membership.findMany({
    where: { OR: [{ clerkUserId: userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])] },
    select: { group: { select: { id: true, name: true, countryCode: true, type: true, modules: true, _count: { select: { members: true } } } } },
  });
  const seen = new Set<string>();
  const groups: Array<{ id: string; name: string; members: number; method: string; monthlyCents: number; currency: string; perMember: boolean }> = [];
  for (const { group } of rows) {
    if (seen.has(group.id)) continue;
    seen.add(group.id);
    const local = localRailFor(group.countryCode, group._count.members);
    if (!local) continue;
    const role = await groupRoleFor(group.id, { userId, phone });
    if (role && PLAN_PAYER_ROLES.has(role)) {
      const { resolveModules } = await import('@stawi/core');
      const mods = resolveModules(group.modules, { groupType: group.type });
      const q = quoteGroup({ country: group.countryCode, members: group._count.members, env: process.env, meetingsOnly: mods.meetings && !mods.money });
      groups.push({ id: group.id, name: group.name, members: group._count.members, method: local.label, monthlyCents: q.monthlyCents, currency: q.currency, perMember: q.perMember });
    }
  }
  return NextResponse.json({ groups });
}

/**
 * POST /api/billing/local  Body: { groupId, tier, period }
 * The group's chairman or treasurer pays the plan the way most people in the
 * group's country pay: M-Pesa (Daraja STK) in Kenya, mobile money (pawaPay
 * prompt to their own phone), or bank transfer / USSD / EFT (Paystack's page).
 * The price is the server's; nothing is paid without the payer's approval,
 * and the plan only moves once the provider confirms it.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (playAppBlocked(req)) return NextResponse.json({ error: PLAY_APP_PURCHASE_UNAVAILABLE }, { status: 403 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Paying needs the live database.' }, { status: 503 });
  }

  let body: { groupId?: string; tier?: string; period?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const groupId = body.groupId?.trim();
  if (!groupId) return NextResponse.json({ error: 'Choose the group to pay for.' }, { status: 400 });
  const tier = (body.tier ?? 'STARTER') as PlanTier;
  const plan = getPlan(tier);
  if (!plan || plan.billing !== 'PER_GROUP') {
    return NextResponse.json({ error: 'This plan is not paid this way.' }, { status: 400 });
  }
  const period = body.period === 'YEAR' ? 'YEAR' : 'MONTH';

  const phone = await getUserPhone().catch(() => null);
  const role = await groupRoleFor(groupId, { userId, phone });
  if (!role || !PLAN_PAYER_ROLES.has(role)) {
    return NextResponse.json({ error: "Only the group's chairman or treasurer can pay the plan." }, { status: 403 });
  }

  const { prisma, createPlanPayment } = await import('@stawi/db');
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { countryCode: true, type: true, modules: true, _count: { select: { members: true } } },
  });
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  // A group using meetings and minutes only pays half where prices are per member (owner 20/11/26).
  const { resolveModules } = await import('@stawi/core');
  const mods = resolveModules(group.modules, { groupType: group.type });
  const meetingsOnly = mods.meetings && !mods.money;
  const members = group._count.members;
  if (tier === 'FREE' && members > SMALL_GROUP_MAX_MEMBERS && !quoteGroup({ country: group.countryCode, members }).perMember) {
    return NextResponse.json(
      { error: `The small-group plan is for groups of ${SMALL_GROUP_MAX_MEMBERS} members or fewer.` },
      { status: 400 },
    );
  }
  const local = localRailFor(group.countryCode, members);
  if (!local) return NextResponse.json({ error: 'Pay by card for now; local payments for your country open soon.' }, { status: 400 });
  const quote = quoteGroup({ country: group.countryCode, members, period, env: process.env, meetingsOnly });
  if (quote.currency !== local.currency || quote.amountCents < 100) {
    return NextResponse.json({ error: 'This price cannot be charged locally.' }, { status: 400 });
  }
  const description = period === 'YEAR' ? `${plan.name} plan, one year` : `${plan.name} plan, one month`;

  try {
    if (local.rail === 'MPESA') {
      // The prompt goes to the phone they sign in with; they approve it on that phone.
      const payer = phone ?? (await getLoginPhone().catch(() => null));
      if (!payer) return NextResponse.json({ error: 'Sign in with your M-Pesa phone number first.' }, { status: 400 });
      if (quote.amountCents % 100 !== 0) return NextResponse.json({ error: 'This price cannot be charged by M-Pesa.' }, { status: 400 });
      const stk = await initiateStkPush({ amountCents: quote.amountCents, payerPhone: payer, accountReference: 'Stawi plan', description });
      await createPlanPayment(prisma, {
        groupId, checkoutRequestId: stk.CheckoutRequestID, tier, period, amountCents: quote.amountCents,
        requestedByUserId: userId, provider: 'mpesa', currency: 'KES',
      });
      return NextResponse.json({ ok: true, method: local.label, amountCents: quote.amountCents, customerMessage: stk.CustomerMessage });
    }

    const reference = `stawi-${crypto.randomUUID()}`;
    const amount = quote.amountCents / 100;
    if (local.rail === 'MOBILE_MONEY') {
      const payer = phone ?? (await getLoginPhone().catch(() => null));
      if (!payer) return NextResponse.json({ error: 'Sign in with your mobile money phone number first.' }, { status: 400 });
      const res = await pawapayDeposit({ env: process.env, amount, currency: quote.currency, phone: payer, message: 'Stawi plan', reference });
      if (!res.ok) {
        const reason = res.reason === 'no_wallet' ? 'That phone number has no mobile money wallet we can reach.' : 'Mobile money did not take the request. Try again in a minute.';
        return NextResponse.json({ error: reason }, { status: 502 });
      }
      await createPlanPayment(prisma, {
        groupId, checkoutRequestId: res.depositId, tier, period, amountCents: quote.amountCents,
        requestedByUserId: userId, provider: 'pawapay', currency: quote.currency,
      });
      return NextResponse.json({ ok: true, method: local.label });
    }

    const user = await getSupabaseUser();
    const email = user?.email?.trim() || `${userId}@payer.getstawi.com`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
    const res = await paystackInitialize({
      env: process.env, email, amount, currency: quote.currency, reference, country: group.countryCode,
      callbackUrl: appUrl ? `${appUrl}/subscribe?status=pending` : undefined,
      metadata: { groupId, tier, period },
    });
    if (!res.ok) return NextResponse.json({ error: 'The payment page could not open. Try again in a minute.' }, { status: 502 });
    await createPlanPayment(prisma, {
      groupId, checkoutRequestId: reference, tier, period, amountCents: quote.amountCents,
      requestedByUserId: userId, provider: 'paystack', currency: quote.currency,
    });
    return NextResponse.json({ ok: true, method: local.label, url: res.url });
  } catch (err) {
    if (err instanceof MpesaConfigError) return NextResponse.json({ error: 'M-Pesa is not set up yet. Please pay by card.' }, { status: 503 });
    console.error('[billing] local plan payment failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'The payment could not start. Try again in a minute.' }, { status: 502 });
  }
}
