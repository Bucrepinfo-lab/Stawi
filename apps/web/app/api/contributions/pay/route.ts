import { NextResponse } from 'next/server';
import {
  CONTRIBUTION_QUICK_CENTS, checkContributionAmount, contributionPayOptions, contributionReference,
  contributionTooSoon, memberPayEnabled,
} from '@stawi/core';
import { getUserId, getUserPhone } from '@/lib/auth';
import { dbEnabled } from '@/lib/data';
import { initiateStkPush, darajaConfig } from '@/lib/mpesa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A member pays THEIR OWN contribution (owner 20/11/26).
 *
 * GET  ?groupId=  → may this member pay here, which way, and to which phone (masked).
 * POST { groupId, amountCents, phone? } → sends the payment prompt to the member's phone.
 *
 * Server-enforced: the caller must be a member of the group and can only pay
 * for their own membership. The member approves the prompt with their own PIN,
 * so no money moves without them. A PENDING contribution is stored and the
 * existing M-Pesa callback confirms it. Collection only.
 *
 * OFF until the owner sets MEMBER_PAY_ENABLED=true: where a group's money
 * settles is an owner and legal decision (docs/MEMBER-PAY.md).
 */

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);
const mask = (phone: string | null) => (phone ? `•••• ${phone.replace(/\D/g, '').slice(-3)}` : null);

function mpesaReady(): boolean {
  try {
    darajaConfig();
    return true;
  } catch {
    return false;
  }
}

async function context(groupId: string, userId: string) {
  const phone = await getUserPhone().catch(() => null);
  if (!dbEnabled()) {
    // Demo (no database): Kenya, the signed-in person as the member.
    return { phone, group: { name: 'Stawi', countryCode: 'KE' }, membershipId: 'demo' as string | null };
  }
  const { prisma } = await import('@stawi/db');
  const key = phone ? last9(phone) : '';
  const [group, membership] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true, countryCode: true } }),
    prisma.membership.findFirst({
      where: { groupId, OR: [{ clerkUserId: userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])] },
      select: { id: true },
    }),
  ]);
  return { phone, group, membershipId: membership?.id ?? null };
}

function switchedOn(): boolean {
  // Demo mode may always be tried; a real database needs the owner's switch.
  return !dbEnabled() || memberPayEnabled(process.env);
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const groupId = new URL(req.url).searchParams.get('groupId') ?? '';
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  const ctx = await context(groupId, userId);
  if (!ctx.group || !ctx.membershipId) return NextResponse.json({ canPay: false, options: [] });
  const options = switchedOn()
    ? contributionPayOptions({ country: ctx.group.countryCode, mpesaOn: mpesaReady() || !dbEnabled() })
    : [];
  const currency = options[0]?.currency ?? 'KES';
  return NextResponse.json({
    canPay: options.length > 0,
    options,
    quickCents: CONTRIBUTION_QUICK_CENTS[currency] ?? [],
    phoneHint: mask(ctx.phone),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: { groupId?: string; amountCents?: number; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const groupId = typeof body.groupId === 'string' ? body.groupId : '';
  if (!groupId) return NextResponse.json({ ok: false, error: 'groupId is required' }, { status: 400 });
  if (!switchedOn()) {
    return NextResponse.json({ ok: false, error: 'Paying from the app is not switched on yet. Please give your contribution to the treasurer.' }, { status: 403 });
  }

  const ctx = await context(groupId, userId);
  if (!ctx.group || !ctx.membershipId) {
    return NextResponse.json({ ok: false, error: 'You are not a member of this group.' }, { status: 403 });
  }

  const ready = mpesaReady();
  const option = contributionPayOptions({ country: ctx.group.countryCode, mpesaOn: ready || !dbEnabled() })[0];
  if (!option || option.way !== 'MPESA') {
    return NextResponse.json({ ok: false, error: 'Paying from the app is not available in your country yet.' }, { status: 503 });
  }

  const amount = checkContributionAmount(body.amountCents, option.currency);
  if (!amount.ok) return NextResponse.json({ ok: false, error: amount.error.en, errorSw: amount.error.sw }, { status: 400 });

  // The member's own sign-in phone unless they type another line they hold.
  const typed = typeof body.phone === 'string' ? body.phone.trim() : '';
  const payerPhone = typed || ctx.phone || '';
  if (last9(payerPhone).length !== 9) {
    return NextResponse.json({ ok: false, error: 'Enter the phone number that will pay.' }, { status: 400 });
  }

  if (!dbEnabled()) {
    if (!ready) return NextResponse.json({ ok: true, demo: true, message: 'Demo: no prompt was sent and no money moved.' });
    if (darajaConfig().env === 'production') {
      return NextResponse.json({ ok: false, error: 'Live M-Pesa requires the database to be configured.' }, { status: 503 });
    }
  }

  try {
    if (dbEnabled()) {
      const { prisma } = await import('@stawi/db');
      const lastAsk = await prisma.contribution.findFirst({
        where: { membershipId: ctx.membershipId, channel: 'MPESA_STK', status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (contributionTooSoon(lastAsk?.createdAt)) {
        return NextResponse.json({ ok: false, error: 'A payment request is already on your phone. Finish it, or wait a minute and try again.' }, { status: 429 });
      }
    }

    const result = await initiateStkPush({
      amountCents: amount.amountCents,
      payerPhone,
      accountReference: contributionReference(ctx.group.name),
      description: 'Contribution',
    });

    if (dbEnabled()) {
      const { prisma, recordContribution, getTenantContext } = await import('@stawi/db');
      const tenant = await getTenantContext(prisma, userId);
      await recordContribution(prisma, {
        groupId,
        membershipId: ctx.membershipId,
        amountCents: amount.amountCents,
        channel: 'MPESA_STK',
        confirmed: false,
        checkoutRequestId: result.CheckoutRequestID,
        recordedByClerkUserId: userId,
        tenantId: tenant?.tenantId,
      });
    }
    return NextResponse.json({ ok: true, checkoutRequestId: result.CheckoutRequestID });
  } catch (err) {
    console.error('[member-pay] request failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'The payment request could not be sent. Please try again.' }, { status: 502 });
  }
}
