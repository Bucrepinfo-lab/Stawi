import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { dbEnabled } from '@/lib/data';
import { loadGroupHouse } from '@/lib/house';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/groups/:id/papers — which papers the group holds and what each
 * purpose still needs. Members of the group only. Carries counts and dates,
 * never a member's name, phone or ID number.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (dbEnabled() && !(await getUserId())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const house = await loadGroupHouse(id);
  if (!house) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    groupId: house.groupId,
    groupName: house.groupName,
    checks: house.checks,
    canOpenPack: house.canOpenPack,
  });
}
