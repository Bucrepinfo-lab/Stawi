import { NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/data';
import { me, myMembershipsWhere } from '@/lib/profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Download all my records: who I am, my groups and every payment in my name (owner 26/11/26). */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const who = await me();
  if (!who) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { prisma } = await import('@stawi/db');
  const { myRecordsCsv } = await import('@stawi/core');
  const [memberships, pin] = await Promise.all([
    prisma.membership.findMany({
      where: myMembershipsWhere(who),
      select: { fullName: true, role: true, group: { select: { name: true } }, contributions: { where: { status: 'CONFIRMED' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true, amountCents: true, channel: true, mpesaRef: true, correctionOfId: true } } },
    }),
    prisma.authPin.findUnique({ where: { userId: who.userId }, select: { phone: true } }),
  ]);
  const p = (n: number) => String(n).padStart(2, '0');
  const dmy = (d: Date) => `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`;
  const WAY: Record<string, string> = { CASH: 'Cash', MPESA_STK: 'M-Pesa', MPESA_C2B: 'M-Pesa', BANK: 'Bank', CARD: 'Card' };
  const csv = myRecordsCsv({
    name: memberships.find((m) => m.fullName !== 'Group founder')?.fullName ?? memberships[0]?.fullName ?? '',
    phone: pin?.phone ?? who.loginPhone,
    groups: memberships.map((m) => ({ name: m.group.name, role: m.role.charAt(0) + m.role.slice(1).toLowerCase() })),
    rows: memberships.flatMap((m) => m.contributions.map((c) => ({ group: m.group.name, date: dmy(c.createdAt), amountCents: c.amountCents, way: c.correctionOfId ? 'Correction' : WAY[c.channel] ?? c.channel, ref: c.mpesaRef }))),
    printed: dmy(new Date()),
  });
  return new NextResponse('﻿' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="stawi-my-records.csv"', 'Cache-Control': 'no-store' },
  });
}
