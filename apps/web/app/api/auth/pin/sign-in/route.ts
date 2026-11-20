import { NextResponse } from 'next/server';
import { afterPinAttempt, isReviewPinLogin, pinLocked, toE164 } from '@stawi/core';
import { currentDevice, pinFeatureEnabled, checkPin, findUserIdByPhone, openSession } from '@/lib/pin';
import { throttles, clientIp } from '@/lib/auth-throttle';
import { signInReviewer } from '@/lib/review-sign-in';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NEED_CODE = 'Ask a group official for a joining code, then choose a new PIN.';

/**
 * POST /api/auth/pin/sign-in { phone?, pin }
 * Step 1 the phone number, step 2 the person's own 4-digit PIN — on any
 * device, no SMS (owner 20/11/26). A trusted device may leave the phone out.
 * Five wrong PINs lock the account until a group official gives a new
 * joining code. The reply never says whether a number has an account. The
 * mobile app sends `app: true` to receive its session tokens.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Sign-in is not set up yet.' }, { status: 503 });
  let body: { phone?: string; pin?: string; app?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const t = throttles();
  if (!t.pinIp.hit(clientIp(req)).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  const typed = /^\d{4}$/.test(body.pin ?? '') ? body.pin! : '';

  // Which account? The typed phone, else this browser's trusted device.
  const device = await currentDevice();
  const phone = body.phone ? toE164(body.phone) : device?.phone ?? null;
  if (!phone) return NextResponse.json({ error: 'Enter your phone number, e.g. 0712 345 678.' }, { status: 400 });
  if (!t.pinPhone.hit(phone).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  // Google Play reviewer: fixed phone + PIN from Fly secrets, nothing else.
  if (isReviewPinLogin(process.env, phone, typed)) {
    const r = await signInReviewer(phone);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, review: true });
  }

  const { prisma, getAuthPin, savePinAttempt, setAuthPinPhone, touchTrustedDevice } = await import('@stawi/db');
  const userId = device && device.phone === phone ? device.userId : await findUserIdByPhone(phone);
  const pin = userId ? await getAuthPin(prisma, userId) : null;
  // Same answer for "no account" and "wrong PIN" so numbers cannot be checked.
  if (!userId || !pin) return NextResponse.json({ error: `That phone number and PIN do not match. ${NEED_CODE}`, needCode: true }, { status: 401 });
  if (pinLocked(pin)) return NextResponse.json({ error: `Too many wrong PINs. ${NEED_CODE}`, needCode: true, locked: true }, { status: 423 });

  const correct = typed !== '' && (await checkPin(typed, pin.pinHash));
  const next = afterPinAttempt(pin, correct, new Date());
  await savePinAttempt(prisma, userId, next);
  if (!correct) {
    if (next.locked) return NextResponse.json({ error: `Too many wrong PINs. ${NEED_CODE}`, needCode: true, locked: true }, { status: 423 });
    return NextResponse.json({ error: `That phone number and PIN do not match. ${next.attemptsLeft} ${next.attemptsLeft === 1 ? 'try' : 'tries'} left.` }, { status: 401 });
  }

  if (!pin.phone) await setAuthPinPhone(prisma, userId, phone);
  const session = await openSession(userId, phone);
  if (!session) return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 502 });
  if (device && device.userId === userId) await touchTrustedDevice(prisma, device.id);
  // The mobile app keeps its own session: it asks for the tokens (app: true).
  return NextResponse.json(body.app === true ? { ok: true, session } : { ok: true });
}
