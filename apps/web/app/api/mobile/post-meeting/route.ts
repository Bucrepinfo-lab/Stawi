import { dbEnabled } from '@/lib/data';
import { publishEvent } from '@/lib/events';
import { ok, bad, authorize, requireMobileGroupRole, preflight, seedAllowed, dbRequired } from '@/lib/mobileApi';

export const runtime = 'nodejs';

export function OPTIONS() { return preflight(); }

/** POST /api/mobile/post-meeting { groupId, meetingNo, generatedDoc } */
export async function POST(req: Request) {
  const auth = await authorize(req); if (auth instanceof Response) return auth;
  let body: any; try { body = await req.json(); } catch { return bad('Invalid JSON'); }
  const { groupId, meetingNo, generatedDoc } = body ?? {};
  if (!groupId || !meetingNo) return bad('groupId and meetingNo are required');
  if (dbEnabled()) { const denied = await requireMobileGroupRole(auth.identity, groupId, 'records'); if (denied) return denied; }
  if (!dbEnabled()) { if (!seedAllowed()) return dbRequired(); publishEvent({ type: 'meeting', channel: 'public' }); return ok({ ok: true, persisted: false }); }
  const { checkMeetingPost } = await import('@/lib/meeting-guard');
  const refused = await checkMeetingPost(groupId, Number(meetingNo));
  if (refused) return bad(refused.error, 422);
  try {
    const { prisma, postMeeting } = await import('@stawi/db');
    await postMeeting(prisma, { groupId, meetingNo, generatedDoc: generatedDoc ?? '' });
    publishEvent({ type: 'meeting', channel: 'public' });
    return ok({ ok: true, persisted: true });
  } catch (e) { return bad(e instanceof Error ? e.message : 'Post failed', 500); }
}
