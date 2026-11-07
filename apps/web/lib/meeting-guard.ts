/**
 * Server-side checks for minutes and month-end statements (web actions and the
 * mobile API share these, so both enforce one rule).
 *
 * The UI only offers the group's own roster members and valid months; these
 * checks make the server refuse anything else, whatever a client sends:
 *  - a meeting may only reference members on the group's saved charter roster
 *    (or those the stored copy of that meeting already referenced);
 *  - minutes can only be posted for a meeting already held (Nairobi clock);
 *  - a statement can only be posted for a month that has POSTED meetings,
 *    not in the future, and its figures are recomputed here from the stored
 *    posted meetings — drafts and the client's numbers are never persisted.
 * Requires DATABASE_URL (callers only use it in DB mode).
 */
import {
  allowedMeetingRefs,
  meetingRefsOutsideRoster,
  checkMeetingDates,
  checkStatementMonth,
  reconcilePostedMonth,
  type GroupCharter,
  type Meeting,
  type MonthEndStatement,
} from '@stawi/core';
import { getCockpit } from '@/lib/cockpit';

type Refusal = { error: string } | null;

async function storedMeeting(groupId: string, meetingNo: number) {
  const { prisma } = await import('@stawi/db');
  return prisma.meeting.findUnique({
    where: { groupId_meetingNo: { groupId, meetingNo } },
    select: { attendance: true, tableBanking: true, date: true, nextMeetingDate: true },
  });
}

/** Refuse a meeting that references anyone outside this group's roster. */
export async function checkMeetingWrite(groupId: string, meeting: any): Promise<Refusal> {
  const meetingNo = Number(meeting?.meetingNo);
  if (!Number.isInteger(meetingNo) || meetingNo < 1) return { error: 'Meeting number missing.' };
  const { prisma, getGroupCharter } = await import('@stawi/db');
  const [charter, stored] = await Promise.all([getGroupCharter(prisma, groupId), storedMeeting(groupId, meetingNo)]);
  const roster = Array.isArray(charter?.members) ? (charter!.members as any[]) : [];
  const allowed = allowedMeetingRefs(
    roster.map((m) => ({ id: String(m?.id ?? ''), fullName: String(m?.fullName ?? '') })),
    stored ? ({ attendance: (stored.attendance as any) ?? [], tableBanking: (stored.tableBanking as any) ?? {} } as Pick<Meeting, 'attendance' | 'tableBanking'>) : null,
  );
  const outside = meetingRefsOutsideRoster(
    { attendance: Array.isArray(meeting?.attendance) ? meeting.attendance : [], tableBanking: meeting?.tableBanking ?? { contributions: [], fines: [] } },
    allowed,
  );
  if (outside.length) {
    return { error: 'These minutes name someone who is not on this group’s saved roster. Save the charter roster first, then record the meeting.' };
  }
  if (meeting?.status === 'POSTED') {
    const dateErr = checkMeetingDates({ date: String(meeting?.date ?? ''), nextMeetingDate: meeting?.nextMeetingDate || undefined });
    if (dateErr) return { error: dateErr };
  }
  return null;
}

/** Refuse posting minutes for a meeting that is not saved or not yet held. */
export async function checkMeetingPost(groupId: string, meetingNo: number): Promise<Refusal> {
  if (!Number.isInteger(meetingNo) || meetingNo < 1) return { error: 'Meeting number missing.' };
  const stored = await storedMeeting(groupId, meetingNo);
  if (!stored) return { error: 'Save the meeting before posting it.' };
  const dateErr = checkMeetingDates({ date: stored.date, nextMeetingDate: stored.nextMeetingDate ?? undefined });
  return dateErr ? { error: dateErr } : null;
}

/**
 * Build the statement to persist for (year, month) from the group's stored
 * charter and meetings, keeping only the officials' edited narrative from the
 * client. Refuses a month the picker would not offer.
 */
export async function buildServerStatement(
  groupId: string,
  year: number,
  month: number,
  narrative: unknown,
): Promise<{ error: string } | { statement: MonthEndStatement }> {
  const cockpit = await getCockpit(groupId);
  if (!cockpit) return { error: 'Group not found.' };
  const monthErr = checkStatementMonth(cockpit.meetings, year, month);
  if (monthErr) return { error: monthErr };
  const charter: GroupCharter = cockpit.charter;
  // Posted meetings only (owner, 07/11/26) — drafts never reach a statement.
  const st = reconcilePostedMonth(cockpit.meetings, charter, { year, month });
  const edited = Array.isArray(narrative)
    ? narrative.filter((p): p is string => typeof p === 'string').map((p) => p.slice(0, 4000)).slice(0, 20)
    : null;
  return { statement: { ...st, narrative: edited && edited.length ? edited : st.narrative } };
}
