import { NextResponse } from 'next/server';
import {
  PLAN_PAYER_ROLES,
  PLAY_APP_COOKIE,
  PLAY_APP_PURCHASE_UNAVAILABLE,
  SMALL_GROUP_MAX_MEMBERS,
  getPlan,
  planPurchasesAllowed,
  quoteGroup,
  type PlanTier,
} from '@stawi/core';
import { getUserId, getUserPhone } from '@/lib/auth';
import { groupRoleFor } from '@/lib/group-access';
import { initiateStkPush, darajaConfig, MpesaConfigError } from '@/lib/mpesa';

export const runtime = 'nodejs';

function playAppBlocked(req: Request): boolean {
  const cookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${PLAY_APP_COOKIE}=([^;]*)`))?.[1] ?? null;
  return !planPurchasesAllowed({ cookie, referrer: req.headers.get('referer') });
}

/**
 * GET /api/billing/mpesa — Kenyan groups the signed-in person may pay the plan
 * for (they are its chairman or treasurer), with member counts.
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
    select: { group: { select: { id: true, name: true, countryCode: true, _count: { select: { members: true } } } } },
  });
  const seen = new Set<string>();
  const groups: Array<{ id: string; name: string; members: number }> = [];
  for (const { group } of rows) {
    if (seen.has(group.id) || group.countryCode !== 'KE') continue;
    seen.add(group.id);
    const role = await groupRoleFor(group.id, { userId, phone });
    if (role && PLAN_PAYER_ROLES.has(role)) groups.push({ id: group.id, name: group.name, members: group._count.members });
  }
  return NextResponse.json({ groups });
}

/**
 * POST /api/billing/mpesa  Body: { groupId, tier, period }
 * Owner decision 19/11/26: M-Pesa leads in Kenya. The group's chairman or
 * treasurer asks M-Pesa to prompt THEIR OWN verified phone for the plan price,
 * which the server sets (group size, period, founding price). Nothing is paid
 * without their PIN; the plan moves only when the callback confirms it.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (playAppBlocked(req)) return NextResponse.json({ error: PLAY_APP_PURCHASE_UNAVAILABLE }, { status: 403 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Paying by M-Pesa needs the live database.' }, { status: 503 });
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
    return NextResponse.json({ error: 'This plan is not paid by M-Pesa.' }, { status: 400 });
  }
  const period = body.period === 'YEAR' ? 'YEAR' : 'MONTH';

  const phone = await getUserPhone().catch(() => null);
  if (!phone) return NextResponse.json({ error: 'Sign in with your M-Pesa phone number first.' }, { status: 400 });
  const role = await groupRoleFor(groupId, { userId, phone });
  if (!role || !PLAN_PAYER_ROLES.has(role)) {
    return NextResponse.json({ error: "Only the group's chairman or treasurer can pay the plan." }, { status: 403 });
  }

  const { prisma, createPlanPayment } = await import('@stawi/db');
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { countryCode: true, _count: { select: { members: true } } },
  });
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  if (group.countryCode !== 'KE') {
    return NextResponse.json({ error: 'M-Pesa is for groups in Kenya. Pay by card instead.' }, { status: 400 });
  }
  const members = group._count.members;
  if (tier === 'FREE' && members > SMALL_GROUP_MAX_MEMBERS) {
    return NextResponse.json(
      { error: `The small-group plan is for groups of ${SMALL_GROUP_MAX_MEMBERS} members or fewer.` },
      { status: 400 },
    );
  }
  const quote = quoteGroup({ country: 'KE', members, period, env: process.env });
  if (quote.currency !== 'KES' || quote.amountCents < 100 || quote.amountCents % 100 !== 0) {
    return NextResponse.json({ error: 'This price cannot be charged by M-Pesa.' }, { status: 400 });
  }

  try {
    darajaConfig();
  } catch (err) {
    const message = err instanceof MpesaConfigError ? 'M-Pesa is not set up yet. Please pay by card.' : 'M-Pesa is not available.';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const stk = await initiateStkPush({
      amountCents: quote.amountCents,
      payerPhone: phone,
      accountReference: 'Stawi plan',
      description: period === 'YEAR' ? `${plan.name} plan, one year` : `${plan.name} plan, one month`,
    });
    await createPlanPayment(prisma, {
      groupId,
      checkoutRequestId: stk.CheckoutRequestID,
      tier,
      period,
      amountCents: quote.amountCents,
      requestedByUserId: userId,
    });
    return NextResponse.json({ ok: true, amountCents: quote.amountCents, customerMessage: stk.CustomerMessage });
  } catch (err) {
    console.error('[mpesa] plan STK failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'M-Pesa did not take the request. Try again in a minute.' }, { status: 502 });
  }
}
