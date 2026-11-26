import { NextResponse } from 'next/server';
import { checkJoinCode, cleanJoinCode, isJoinCodeShape, phoneKey, toE164 } from '@stawi/core';
import { deviceCrypto, pinFeatureEnabled } from '@/lib/pin';
import { throttles, clientIp } from '@/lib/auth-throttle';
import { getLoginPhone, getUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/join-more { code }
 * One phone, many chamas (owner 26/11/26). Someone already signed in adds
 * another chama that has added their number: they type that group's joining
 * code. Same checks as /api/auth/join (tied to this phone, once, 48 hours, 5
 * tries), but the session and PIN stay as they are — the chama simply joins
 * the list in "Switch chama".
 */
export async function POST(req: Request) {
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Not set up yet.' }, { status: 503 });
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = cleanJoinCode(body.code);
  if (!isJoinCodeShape(code)) return NextResponse.json({ error: 'Enter the 6-digit joining code.' }, { status: 400 });

  const { prisma, openJoinCodes, addJoinCodeTry, useJoinCode, linkMembershipsByPhone } = await import('@stawi/db');
  const pinRow = await prisma.authPin.findUnique({ where: { userId }, select: { phone: true } });
  const phone = toE164(pinRow?.phone ?? (await getLoginPhone()) ?? '');
  if (!phone) return NextResponse.json({ error: 'Your account has no phone number yet. Add it in My profile first.' }, { status: 400 });

  const t = throttles();
  if (!t.verifyIp.hit(clientIp(req)).allowed || !t.verifyPhone.hit(phone).allowed) {
    return NextResponse.json({ error: 'Too many tries. Wait 15 minutes, then try again.' }, { status: 429 });
  }
  const rows = await openJoinCodes(prisma, phoneKey(phone), new Date());
  const result = checkJoinCode(rows, code, new Date(), deviceCrypto.hmac);
  if (!result.ok) {
    if (result.rowId) await addJoinCodeTry(prisma, result.rowId);
    const why = result.reason === 'none'
      ? `No chama has an open joining code for ${phone}. Ask that chama's official to add this number and give you a code.`
      : result.burned
        ? 'That code has been tried too many times. Ask the official for a new one.'
        : 'That joining code is not right. Check it and try again.';
    return NextResponse.json({ error: why }, { status: 400 });
  }
  if (result.rowId) await useJoinCode(prisma, result.rowId);
  // The code proves the phone: link the roster rows carrying it, and remember it is proven.
  await linkMembershipsByPhone(prisma, userId, [phone]).catch(() => undefined);
  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  await createSupabaseAdminClient()?.auth.admin.updateUserById(userId, { app_metadata: { phone_proved: true } }).catch(() => undefined);
  const group = result.groupId ? await prisma.group.findUnique({ where: { id: result.groupId }, select: { id: true, name: true } }) : null;
  return NextResponse.json({ ok: true, groupId: group?.id ?? null, groupName: group?.name ?? null });
}
