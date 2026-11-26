import { NextResponse } from 'next/server';
import { pinProblem } from '@stawi/core';
import { getSupabaseUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { pinFeatureEnabled, hashPin, sessionPassword, trustThisDevice, pinSetupAllowed, clearPinSetupAllowed } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/pin/setup { pin }
 * Right after a redeemed joining code: set (or reset — forgotten/locked PIN)
 * the 4-digit PIN and trust this device. Requires the signed-in session.
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'PIN sign-in is not available.' }, { status: 400 });
  const user = await getSupabaseUser();
  if (!user?.id || !user.phone) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  // A PIN may only be set (or reset) right after a joining code in this browser.
  if (!(await pinSetupAllowed(user.id))) {
    return NextResponse.json({ error: 'Enter the joining code your group official gave you first (in person or on WhatsApp; nothing is sent by SMS).', needCode: true }, { status: 401 });
  }
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const problem = pinProblem(body.pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const phone = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;
  const { prisma, setAuthPin } = await import('@stawi/db');
  const row = await setAuthPin(prisma, user.id, await hashPin(body.pin!.trim()), phone);

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'PIN sign-in is not available.' }, { status: 503 });
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: sessionPassword(user.id, row.sessionEpoch) });
  if (error) return NextResponse.json({ error: 'Could not save your PIN. Try again.' }, { status: 502 });

  await trustThisDevice(user.id, phone, req.headers.get('user-agent'));
  await clearPinSetupAllowed();
  return NextResponse.json({ ok: true });
}
