import { NextResponse } from 'next/server';
import { parseStkCallback, notifyPaymentConfirmed, formatMoney } from '@stawi/core';
import { sendSms } from '@/lib/notify';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/callback
 * Daraja calls this after the customer responds to the STK prompt.
 * Public route. Must ALWAYS return 200 {ResultCode:0} or Daraja keeps retrying.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Ignored' });
  }

  try {
    const result = parseStkCallback(raw as Parameters<typeof parseStkCallback>[0]);

    if (result.ok) {
      // Mark the pending contribution confirmed (when a DB is configured).
      if (dbEnabled()) {
        const { prisma, confirmContribution } = await import('@stawi/db');
        await confirmContribution(prisma, result.checkoutRequestId, result.mpesaReceipt ?? '');
      }

      // Acknowledge to the payer by SMS (best-effort, no-op without AT creds).
      const note = notifyPaymentConfirmed('You', (result.amount ?? 0) * 100, result.mpesaReceipt);
      if (result.phone) {
        await sendSms(
          result.phone,
          `Stawi: payment of KES ${formatMoney((result.amount ?? 0) * 100)} received. Ref ${result.mpesaReceipt ?? '-'}. Asante!`,
        );
      }
      console.info('[mpesa] confirmed', result.checkoutRequestId, note.title);
    } else {
      console.warn('[mpesa] failed', result.checkoutRequestId, result.resultDesc);
    }
  } catch (err) {
    console.error('[mpesa] callback parse error', err);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
