import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { initiateStkPush } from '@/lib/mpesa';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/stk — treasurer-initiated contribution collection via STK Push.
 * Body: { amountCents, payerPhone, accountReference, description, membershipId, groupId }
 * On success (DB mode) a PENDING Contribution is stored keyed by CheckoutRequestID;
 * the callback flips it to CONFIRMED.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
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
  if (!amountCents || amountCents <= 0 || !payerPhone) {
    return NextResponse.json({ error: 'amountCents (>0) and payerPhone are required' }, { status: 400 });
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
