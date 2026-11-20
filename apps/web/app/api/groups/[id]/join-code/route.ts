import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { JOIN_CODE_TTL_MS, joinCodeMaterial, joinCodeMessage, newJoinCode, phoneKey } from '@stawi/core';
import { getUserId, getUserPhone } from '@/lib/auth';
import { RECORD_EDITOR_ROLES, groupRoleFor } from '@/lib/group-access';
import { deviceCrypto, pinFeatureEnabled } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/groups/:id/join-code { phone, lang? }
 * A group official (chairperson, secretary or treasurer — checked here, on the
 * server) gives a member on this group's list a one-time joining code, to
 * hand over face to face or on WhatsApp. Replaces the SMS sign-in code
 * (owner 20/11/26). The code is shown once and only its keyed hash is kept.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;
  if (!pinFeatureEnabled()) return NextResponse.json({ error: 'Sign-in is not set up yet.' }, { status: 503 });
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const role = await groupRoleFor(groupId, { userId, phone: await getUserPhone().catch(() => null) });
  if (!role || !RECORD_EDITOR_ROLES.has(role)) {
    return NextResponse.json({ error: 'Only the chairperson, secretary or treasurer can give joining codes.' }, { status: 403 });
  }

  let body: { phone?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const key = phoneKey(body.phone ?? '');
  const { prisma, rosterRowForPhone, createJoinCode } = await import('@stawi/db');
  const member = await rosterRowForPhone(prisma, groupId, key);
  if (!member) return NextResponse.json({ error: 'Save this member with their phone number first.' }, { status: 400 });

  const issuer = await prisma.membership.findFirst({ where: { groupId, clerkUserId: userId }, select: { id: true } });
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  const code = newJoinCode((max) => crypto.randomInt(max));
  const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MS);
  await createJoinCode(prisma, {
    groupId,
    phoneKey: key,
    codeHash: deviceCrypto.hmac(joinCodeMaterial(groupId, key, code)),
    expiresAt,
    issuedBy: issuer?.id ?? userId,
  });
  const site = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(/^https?:\/\//, '').replace(/\/$/, '');
  return NextResponse.json({
    ok: true,
    code,
    expiresAt: expiresAt.toISOString(),
    message: joinCodeMessage({ name: member.fullName, groupName: group?.name ?? 'your group', code, site, lang: body.lang === 'sw' ? 'sw' : 'en' }),
  });
}
