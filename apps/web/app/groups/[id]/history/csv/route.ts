import { NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/data';
import { historyFor } from '../access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Download my payment history as a spreadsheet file (owner 26/11/26). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const { id } = await params;
  const access = await historyFor(id, new URL(req.url).searchParams.get('member'));
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { loadMemberHistory } = await import('@/lib/money-trust');
  const { memberHistoryCsv } = await import('@stawi/core');
  const h = await loadMemberHistory(id, access.ids);
  const csv = memberHistoryCsv({ groupName: h.groupName, memberName: h.memberName, lines: h.lines, totalCents: h.totalCents });
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'member';
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stawi-${slug(h.memberName)}-payments.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
