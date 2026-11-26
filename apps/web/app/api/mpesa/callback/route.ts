import { NextResponse } from 'next/server';
import { parseStkCallback, notifyPaymentConfirmed, callbackTokenMatches } from '@stawi/core';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/callback
 * Daraja calls this after the customer responds to the STK prompt.
 * Public route. Must ALWAYS return 200 {ResultCode:0} or Daraja keeps retrying.
 */
export async function POST(req: Request) {
  // Optional shared token (MPESA_CALLBACK_TOKEN, appended to the callback URL
  // we give Daraja). A mismatch is acknowledged but ignored — never confirms.
  const token = new URL(req.url).searchParams.get('token');
  if (!callbackTokenMatches(process.env.MPESA_CALLBACK_TOKEN?.trim() || undefined, token)) {
    console.warn('[mpesa] callback with bad token ignored');
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Ignored' });
  }

  try {
    const result = parseStkCallback(raw as Parameters<typeof parseStkCallback>[0]);

    // A plan payment (owner 19/11/26): confirms and extends the group's plan
    // on a full, successful payment, once; a short or failed one unlocks nothing.
    if (dbEnabled() && result.checkoutRequestId) {
      const { prisma, settlePlanPayment } = await import('@stawi/db');
      const plan = await settlePlanPayment(prisma, {
        checkoutRequestId: result.checkoutRequestId,
        ok: result.ok,
        mpesaRef: result.mpesaReceipt,
        paidKes: result.amount,
        provider: 'mpesa',
      });
      if (plan) console.info('[mpesa] plan payment', result.checkoutRequestId, plan);
    }

    if (result.ok) {
      // Mark the pending contribution confirmed (when a DB is configured).
      if (dbEnabled()) {
        const { prisma, confirmContribution } = await import('@stawi/db');
        const waiting = await prisma.contribution.findFirst({ where: { checkoutRequestId: result.checkoutRequestId, status: 'PENDING' }, select: { id: true, recordedByClerkUserId: true } });
        await confirmContribution(prisma, result.checkoutRequestId, result.mpesaReceipt ?? '');
        // Alert the group once, when the payment first confirms (owner 26/11/26).
        if (waiting) void (await import('@/lib/group-alerts')).alertNewContribution(waiting.id, waiting.recordedByClerkUserId);
      }

      // No SMS from Stawi (owner 20/11/26): M-Pesa itself texts the payer its
      // confirmation, and the receipt shows in the app.
      const note = notifyPaymentConfirmed('You', (result.amount ?? 0) * 100, result.mpesaReceipt);
      console.info('[mpesa] confirmed', result.checkoutRequestId, note.title);
    } else {
      console.warn('[mpesa] failed', result.checkoutRequestId, result.resultDesc);
    }
  } catch (err) {
    console.error('[mpesa] callback parse error', err);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
