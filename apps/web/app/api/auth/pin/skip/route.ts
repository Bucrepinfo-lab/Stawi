import { NextResponse } from 'next/server';
import { isReviewPhone, PIN_SKIP_COOKIE } from '@stawi/core';
import { getUserPhone } from '@/lib/auth';

export const runtime = 'nodejs';

/** POST /api/auth/pin/skip — the Play reviewer demo account only may skip PIN setup. */
export async function POST() {
  const phone = await getUserPhone();
  if (!isReviewPhone(process.env, phone)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PIN_SKIP_COOKIE, '1', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
  return res;
}
