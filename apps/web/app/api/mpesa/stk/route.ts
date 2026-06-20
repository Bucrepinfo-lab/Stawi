import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { initiateStkPush } from '@/lib/mpesa';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/stk
 * Treasurer-initiated contribution collection via STK Push.
 * Body: { amountCents, payerPhone, accountReference, description, membershipId, groupId }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    amountCents?: number;
    payerPhone?: string;
    accountReference?: string;
    description?: string;
    membershipId?: string;
    groupId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { amountCents, payerPhone, accountReference, description } = body;
  if (!amountCents || amountCents <= 0 || !payerPhone) {
    return NextResponse.json(
      { error: 'amountCents (>0) and payerPhone are required' },
      { status: 400 },
    );
  }

  try {
    const result = await initiateStkPush({
      amountCents,
      payerPhone,
      accountReference: accountReference ?? 'Stawi',
      description: description ?? 'Contribution',
    });

    // TODO: persist a PENDING Contribution keyed by result.CheckoutRequestID
    // (membershipId, groupId, recordedByClerkUserId = userId) so the callback
    // can flip it to CONFIRMED. Requires @stawi/db wired with DATABASE_URL.

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
