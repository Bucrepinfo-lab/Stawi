import { NextResponse } from 'next/server';
import { checkJoinCode, cleanJoinCode, isJoinCodeShape, phoneKey, toE164 } from '@stawi/core';
import { deviceCrypto, ensurePhoneUser, markPinSetupAllowed, openSession, pinFeatureEnabled } from '@/lib/pin';
import { throttles, clientIp } from '@/lib/auth-throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/join { phone, code }
 * Redeem the joining code a group official gave (owner 20/11/26, replaces the
 * SMS code). The code is tied to one group and this phone, works once,
 * expires after 48 hours and is burned after 5 wrong tries. On success the
 * phone counts as proven, the session opens and the person chooses a PIN.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Sign-in is not set up yet.' }, { status: 503 });
  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const phone = toE164(body.phone ?? '');
  const code = cleanJoinCode(body.code);
  if (!phone) return NextResponse.json({ error: 'Enter your phone number, e.g. 0712 345 678.' }, { status: 400 });
  if (!isJoinCodeShape(code)) return NextResponse.json({ error: 'Enter the 6-digit joining code.' }, { status: 400 });

  const t = throttles();
  if (!t.verifyIp.hit(clientIp(req)).allowed || !t.verifyPhone.hit(phone).allowed) {
    return NextResponse.json({ error: 'Too many tries. Wait 15 minutes, then try again.' }, { status: 429 });
  }

  const { prisma, openJoinCodes, addJoinCodeTry, useJoinCode, linkMembershipsByPhone } = await import('@stawi/db');
  const key = phoneKey(phone);
  const rows = await openJoinCodes(prisma, key, new Date());
  const result = checkJoinCode(rows, code, new Date(), deviceCrypto.hmac);
  if (!result.ok) {
    if (result.rowId) await addJoinCodeTry(prisma, result.rowId);
    const why = result.reason === 'none'
      ? 'There is no open joining code for this number. Ask a group official for a new one.'
      : result.burned
        ? 'That code has been tried too many times. Ask a group official for a new one.'
        : 'That joining code is not right. Check it and try again.';
    return NextResponse.json({ error: why }, { status: 400 });
  }
  await useJoinCode(prisma, result.rowId!);

  const user = await ensurePhoneUser(phone, true);
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: 503 });
  // The phone is proven: link every roster row carrying it to this account.
  await linkMembershipsByPhone(prisma, user.userId, [phone]).catch(() => undefined);
  if (!(await openSession(user.userId, phone))) return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 502 });
  await markPinSetupAllowed(user.userId);
  return NextResponse.json({ ok: true, groupId: result.groupId });
}
