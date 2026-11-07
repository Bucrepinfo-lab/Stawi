import { NextResponse } from 'next/server';
import { toE164, otpExpired, isOtpShape, isReviewLogin } from '@stawi/core';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throttles, clientIp } from '@/lib/auth-throttle';
import { signInReviewer } from '@/lib/review-sign-in';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/verify { phone, code }
 * Checks the SMS code server-side: valid for 5 minutes, single use, attempts
 * rate-limited per phone and per IP. On success the Supabase session cookies
 * are set. The Play reviewer (PLAY_REVIEW_PHONE + PLAY_REVIEW_CODE) is the only
 * number that may use a fixed code.
 */
export async function POST(req: Request) {
  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const phone = toE164(body.phone ?? '');
  const code = (body.code ?? '').trim();
  if (!phone || !isOtpShape(code)) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });

  const t = throttles();
  if (!t.verifyIp.hit(clientIp(req)).allowed || !t.verifyPhone.hit(phone).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Request a new code in 15 minutes.' }, { status: 429 });
  }

  if (isReviewLogin(process.env, phone, code)) {
    const r = await signInReviewer(phone);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    t.otpSentAt.delete(phone);
    return NextResponse.json({ ok: true, review: true });
  }

  if (otpExpired(t.otpSentAt.get(phone), Date.now())) {
    t.otpSentAt.delete(phone);
    return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (error) return NextResponse.json({ error: 'That code is not right. Check the SMS and try again.' }, { status: 400 });

  // Single use: forget the code window and reset this number's attempt counter.
  t.otpSentAt.delete(phone);
  t.verifyPhone.reset(phone);
  return NextResponse.json({ ok: true });
}
