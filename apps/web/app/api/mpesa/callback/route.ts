import { NextResponse } from 'next/server';
import { parseStkCallback } from '@stawi/core';

export const runtime = 'nodejs';

/**
 * POST /api/mpesa/callback
 * Daraja calls this after the customer responds to the STK prompt.
 * Public route (Safaricom is the caller) — see middleware allowlist.
 *
 * Must ALWAYS return 200 with {ResultCode:0} or Daraja keeps retrying.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    // Acknowledge anyway so Safaricom doesn't retry a malformed delivery.
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Ignored' });
  }

  try {
    const result = parseStkCallback(raw as Parameters<typeof parseStkCallback>[0]);

    if (result.ok) {
      // TODO: find the PENDING Contribution by result.checkoutRequestId,
      // set status=CONFIRMED, store result.mpesaReceipt, recompute capital
      // shares (computeCapitalShares) and push the live update to members.
      console.info('[mpesa] confirmed', result.checkoutRequestId, result.mpesaReceipt);
    } else {
      // TODO: mark the Contribution FAILED with result.resultDesc.
      console.warn('[mpesa] failed', result.checkoutRequestId, result.resultDesc);
    }
  } catch (err) {
    console.error('[mpesa] callback parse error', err);
  }

  // Always acknowledge.
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
