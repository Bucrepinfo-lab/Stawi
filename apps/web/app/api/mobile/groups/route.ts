import { findMemberGroups, type GroupDirectory } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { getCockpit } from '@/lib/cockpit';
import { MY_GROUPS } from '@/lib/groups';
import { phoneForLookup } from '@stawi/core';
import { ok, bad, authorize, requireMobileGroupRole, preflight, seedAllowed, dbRequired } from '@/lib/mobileApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() { return preflight(); }

/**
 * GET /api/mobile/groups → groups of the SIGNED-IN caller's verified phone.
 * A `?phone=` that differs from the session's phone is refused — typing a
 * number never lists anyone's groups.
 */
export async function GET(req: Request) {
  const auth = await authorize(req); if (auth instanceof Response) return auth;
  const requested = new URL(req.url).searchParams.get('phone')?.trim() ?? '';
  let phone = requested;
  if (auth.identity) {
    const own = phoneForLookup(auth.identity, requested);
    if (!own) return bad('You can only list your own groups', 403);
    phone = own;
  }
  if (!phone) return bad('phone is required');

  if (dbEnabled()) {
    const { prisma, getGroupsByPhone } = await import('@stawi/db');
    const groups = await getGroupsByPhone(prisma, phone);
    return ok({ links: groups.map((g: any) => ({ groupId: g.id, groupName: g.name, memberName: 'You', designation: g.myRole, isOfficial: ['Chairman', 'Secretary', 'Treasurer', 'Signatory'].includes(g.myRole) })) });
  }

  // Non-production only: build a directory from the cockpit seed. Never in prod.
  if (!seedAllowed()) return dbRequired();
  const dirs: GroupDirectory[] = [];
  for (const g of MY_GROUPS) {
    const c = await getCockpit(g.id);
    if (c) dirs.push({ groupId: g.id, groupName: c.groupName, members: c.charter.members.map((m) => ({ name: m.fullName, phone: m.phone, designation: m.designation })) });
  }
  return ok({ links: findMemberGroups(phone, dirs) });
}
