import { NextResponse } from 'next/server';
import { toE164, OTP_LIMITS } from '@stawi/core';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throttles, clientIp } from '@/lib/auth-throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/send { phone }
 * Sends a 6-digit SMS code (Supabase phone OTP → Send-SMS hook → Africa's
 * Talking), rate-limited per phone number and per IP on the server. The reply
 * never says whether the number has an account.
 */
export async function POST(req: Request) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const phone = toE164(body.phone ?? '');
  if (!phone) return NextResponse.json({ error: 'Enter a valid phone number, e.g. 0712 345 678.' }, { status: 400 });

  const t = throttles();
  const now = Date.now();
  const last = t.otpSentAt.get(phone);
  if (last !== undefined && now - last < OTP_LIMITS.resendGapMs) {
    return NextResponse.json({ error: 'Please wait a minute before asking for another code.' }, { status: 429 });
  }
  if (!t.sendIp.hit(clientIp(req)).allowed || !t.sendPhone.hit(phone).allowed) {
    return NextResponse.json({ error: 'Too many codes requested. Try again in 15 minutes.' }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (error) return NextResponse.json({ error: 'Could not send the code. Try again shortly.' }, { status: 502 });

  t.otpSentAt.set(phone, now);
  return NextResponse.json({ ok: true, phone });
}
