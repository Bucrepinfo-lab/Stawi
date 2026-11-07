import { NextResponse } from 'next/server';
import { pinProblem } from '@stawi/core';
import { getSupabaseUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { pinFeatureEnabled, hashPin, sessionPassword, trustThisDevice, smsVerifiedRecently, clearSmsVerified } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/pin/setup { pin }
 * After a verified SMS sign-in: set (or reset — forgotten/locked PIN) the 4-digit
 * PIN and trust this device. Requires the signed-in session.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'PIN sign-in is not available.' }, { status: 400 });
  const user = await getSupabaseUser();
  if (!user?.id || !user.phone) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  // A PIN may only be set (or reset) right after a verified SMS code in this browser.
  if (!(await smsVerifiedRecently(user.id))) {
    return NextResponse.json({ error: 'Confirm with an SMS code first.', needSms: true }, { status: 401 });
  }
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const problem = pinProblem(body.pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { prisma, setAuthPin } = await import('@stawi/db');
  const row = await setAuthPin(prisma, user.id, await hashPin(body.pin!.trim()));

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'PIN sign-in is not available.' }, { status: 503 });
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: sessionPassword(user.id, row.sessionEpoch) });
  if (error) return NextResponse.json({ error: 'Could not save your PIN. Try again.' }, { status: 502 });

  const phone = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;
  await trustThisDevice(user.id, phone, req.headers.get('user-agent'));
  await clearSmsVerified();
  return NextResponse.json({ ok: true });
}
