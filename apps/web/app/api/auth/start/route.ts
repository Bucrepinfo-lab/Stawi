import { NextResponse } from 'next/server';
import { phoneKey, pinProblem, toE164 } from '@stawi/core';
import { ensurePhoneUser, findUserIdByPhone, hashPin, openSession, pinFeatureEnabled, trustThisDevice } from '@/lib/pin';
import { throttles, clientIp } from '@/lib/auth-throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/start { phone, pin }
 * Someone starting their own group or books opens an account with their phone
 * and a 4-digit PIN — no SMS (owner 20/11/26). The phone stays unproven: they
 * reach the groups they create, never another group's roster by phone. A
 * number a group has already added must use that group's joining code.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Sign-in is not set up yet.' }, { status: 503 });
  let body: { phone?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const phone = toE164(body.phone ?? '');
  if (!phone) return NextResponse.json({ error: 'Enter your phone number, e.g. 0712 345 678.' }, { status: 400 });
  const problem = pinProblem(body.pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (!throttles().startIp.hit(clientIp(req)).allowed) {
    return NextResponse.json({ error: 'Too many new accounts from here. Try again in an hour.' }, { status: 429 });
  }

  const { prisma, phoneOnAnyRoster, setAuthPin } = await import('@stawi/db');
  if (await findUserIdByPhone(phone)) {
    return NextResponse.json({ error: 'This number already has a Stawi account. Sign in with your PIN, or ask a group official for your joining code (given in person, never by SMS).', exists: true }, { status: 409 });
  }
  if (await phoneOnAnyRoster(prisma, phoneKey(phone))) {
    return NextResponse.json({ error: 'A group has already added this number. Ask one of its officials for your joining code. They give it in person or on WhatsApp; nothing is sent by SMS.', needCode: true }, { status: 409 });
  }

  const user = await ensurePhoneUser(phone, false);
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: 503 });
  await setAuthPin(prisma, user.userId, await hashPin(body.pin!.trim()), phone);
  if (!(await openSession(user.userId, phone))) return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 502 });
  await trustThisDevice(user.userId, phone, req.headers.get('user-agent'));
  return NextResponse.json({ ok: true });
}
