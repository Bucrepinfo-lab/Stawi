import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { initiateStkPush, darajaConfig, MpesaConfigError } from '@/lib/mpesa';
import { dbEnabled } from '@/lib/data';
import { myGroupRole, MONEY_ROLES } from '@/lib/group-access';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/stk — treasurer-initiated contribution collection via STK Push.
 * Body: { amountCents, payerPhone, accountReference, description, membershipId, groupId }
 *
 * Server-enforced: the caller must be the TREASURER of `groupId`, and the member
 * must belong to that group. The payer approves the prompt on their own phone —
 * no money moves without them. A PENDING Contribution is stored keyed by
 * CheckoutRequestID; the callback flips it to CONFIRMED. Collection only (no B2C).
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    amountCents?: number; payerPhone?: string; accountReference?: string;
    description?: string; membershipId?: string; groupId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { amountCents, payerPhone, accountReference, description, membershipId, groupId } = body;
  if (!amountCents || !Number.isInteger(amountCents) || amountCents < 100 || !payerPhone) {
    return NextResponse.json({ error: 'amountCents (whole shillings, at least KES 1) and payerPhone are required' }, { status: 400 });
  }

  let env: 'sandbox' | 'production';
  try {
    env = darajaConfig().env;
  } catch (err) {
    const message = err instanceof MpesaConfigError ? err.message : 'M-Pesa is not configured';
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }

  if (dbEnabled()) {
    if (!groupId || !membershipId) {
      return NextResponse.json({ error: 'groupId and membershipId are required' }, { status: 400 });
    }
    const role = await myGroupRole(groupId);
    if (!role || !MONEY_ROLES.has(role)) {
      return NextResponse.json({ error: 'Only the group treasurer can request M-Pesa payments.' }, { status: 403 });
    }
    const { prisma } = await import('@stawi/db');
    const member = await prisma.membership.findFirst({ where: { id: membershipId, groupId }, select: { id: true } });
    if (!member) return NextResponse.json({ error: 'Member not found in this group' }, { status: 404 });
  } else if (env === 'production') {
    // Without a database there is nowhere to record the payment — refuse live collection.
    return NextResponse.json({ ok: false, error: 'Live M-Pesa requires the database to be configured.' }, { status: 503 });
  }

  try {
    const result = await initiateStkPush({
      amountCents,
      payerPhone,
      accountReference: accountReference ?? 'Stawi',
      description: description ?? 'Contribution',
    });

    // Persist a PENDING contribution so the callback can confirm it (DB mode).
    if (dbEnabled() && groupId && membershipId) {
      const { prisma, recordContribution, getTenantContext } = await import('@stawi/db');
      const ctx = await getTenantContext(prisma, userId);
      await recordContribution(prisma, {
        groupId,
        membershipId,
        amountCents,
        channel: 'MPESA_STK',
        confirmed: false,
        checkoutRequestId: result.CheckoutRequestID,
        recordedByClerkUserId: userId,
        tenantId: ctx?.tenantId,
      });
    }

    return NextResponse.json({
      ok: true,
      checkoutRequestId: result.CheckoutRequestID,
      customerMessage: result.CustomerMessage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'STK Push error';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
