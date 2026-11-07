import { getCockpit } from '@/lib/cockpit';
import { dbEnabled } from '@/lib/data';
import { ok, bad, authorize, requireMobileGroupRole, preflight, seedAllowed, dbRequired } from '@/lib/mobileApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() { return preflight(); }

/** GET /api/mobile/cockpit?groupId=umoja → { groupId, groupName, charter, meetings } */
export async function GET(req: Request) {
  const auth = await authorize(req); if (auth instanceof Response) return auth;
  const groupId = new URL(req.url).searchParams.get('groupId')?.trim();
  if (!groupId) return bad('groupId is required');
  if (!dbEnabled() && !seedAllowed()) return dbRequired();
  if (dbEnabled()) { const denied = await requireMobileGroupRole(auth.identity, groupId, 'member'); if (denied) return denied; }
  const cockpit = await getCockpit(groupId);
  if (!cockpit) return bad('Group not found', 404);
  return ok(cockpit);
}
