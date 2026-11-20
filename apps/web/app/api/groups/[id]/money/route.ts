import { NextResponse } from 'next/server';
import { harmoniseMoney, trimStatement } from '@stawi/core';
import { getUserId } from '@/lib/auth';
import { dbEnabled } from '@/lib/data';
import { loadGroupHouse } from '@/lib/house';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/groups/:id/money — the group's table money and its business books
 * added up by day, week and month, with the checks that show they agree.
 * Members of the group only. Totals only: no member's name or amount.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (dbEnabled() && !(await getUserId())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const house = await loadGroupHouse(id);
  if (!house) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const money = harmoniseMoney({ meetings: house.cockpit.meetings, entries: house.business?.entries ?? [] });
  return NextResponse.json({
    groupName: house.groupName,
    businessName: house.business?.name ?? null,
    currency: 'KES',
    day: trimStatement(money.day, 31),
    week: trimStatement(money.week, 13),
    month: trimStatement(money.month, 24),
    checks: money.checks,
    hasGroup: money.hasGroup,
    hasBusiness: money.hasBusiness,
  });
}
