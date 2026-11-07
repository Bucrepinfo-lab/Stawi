import { NextResponse } from 'next/server';
import { afterPinAttempt, pinLocked } from '@stawi/core';
import { currentDevice, pinFeatureEnabled, checkPin, sessionPassword } from '@/lib/pin';
import { throttles, clientIp } from '@/lib/auth-throttle';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/pin/sign-in { pin }
 * Only from a trusted device (signed device cookie, not revoked). Five wrong
 * PINs lock it — the next sign-in needs a new SMS code.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Use the SMS code.', needSms: true }, { status: 400 });
  if (!throttles().pinIp.hit(clientIp(req)).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const device = await currentDevice();
  if (!device) return NextResponse.json({ error: 'Sign in with an SMS code on this device.', needSms: true }, { status: 401 });

  const { prisma, getAuthPin, savePinAttempt, touchTrustedDevice } = await import('@stawi/db');
  const pin = await getAuthPin(prisma, device.userId);
  if (!pin) return NextResponse.json({ error: 'Sign in with an SMS code.', needSms: true }, { status: 401 });
  if (pinLocked(pin)) {
    return NextResponse.json({ error: 'Too many wrong PINs. Sign in with an SMS code.', needSms: true, locked: true }, { status: 423 });
  }

  const correct = /^\d{4}$/.test(body.pin ?? '') && (await checkPin(body.pin!, pin.pinHash));
  const next = afterPinAttempt(pin, correct, new Date());
  await savePinAttempt(prisma, device.userId, next);
  if (!correct) {
    if (next.locked) {
      return NextResponse.json({ error: 'Too many wrong PINs. Sign in with an SMS code.', needSms: true, locked: true }, { status: 423 });
    }
    return NextResponse.json({ error: `Wrong PIN. ${next.attemptsLeft} ${next.attemptsLeft === 1 ? 'try' : 'tries'} left.`, attemptsLeft: next.attemptsLeft }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ phone: device.phone, password: sessionPassword(device.userId, pin.sessionEpoch) });
  if (error) return NextResponse.json({ error: 'Sign in with an SMS code.', needSms: true }, { status: 401 });
  await touchTrustedDevice(prisma, device.id);
  return NextResponse.json({ ok: true });
}
