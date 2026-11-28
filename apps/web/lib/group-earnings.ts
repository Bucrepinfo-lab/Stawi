/**
 * Load a group's earnings (owner 28/11/26): table banking extra from every
 * round, open or closed, and fines from every meeting's minutes. Read-only;
 * the caller checks the viewer belongs to the group first.
 */
import { groupEarnings, COUNTRY_TIME_ZONE, type EarningsFine, type EarningsTurn, type GroupEarnings } from '@stawi/core';

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export async function loadGroupEarnings(groupId: string): Promise<GroupEarnings> {
  const { prisma } = await import('@stawi/db');
  const [rounds, members, meetings] = await Promise.all([
    prisma.tableRound.findMany({ where: { groupId }, orderBy: { createdAt: 'asc' }, include: { turns: { orderBy: { turn: 'asc' } } } }),
    prisma.membership.findMany({ where: { groupId }, select: { id: true, fullName: true } }),
    prisma.meeting.findMany({ where: { groupId }, orderBy: { meetingNo: 'asc' }, select: { meetingNo: true, date: true, status: true, tableBanking: true } }),
  ]);
  const names = new Map(members.map((m) => [m.id, m.fullName]));
  const turns: EarningsTurn[] = rounds.flatMap((r, i) =>
    r.turns.map((t) => ({
      roundNo: i + 1,
      turn: t.turn,
      name: names.get(t.membershipId) ?? 'A member',
      givenCents: t.givenCents,
      returnCents: t.returnCents,
      returnOn: day(t.returnOn) ?? '',
      returnedCents: t.returnedAt ? (t.returnedCents ?? t.returnCents) : null,
      returnedOn: day(t.returnedAt),
      given: !!t.givenAt,
    })),
  );
  const fines: EarningsFine[] = [];
  for (const m of meetings) {
    const tb = (m.tableBanking ?? {}) as { fines?: { name?: string; memberId?: string; reason?: string; amountCents?: number }[] };
    for (const f of Array.isArray(tb.fines) ? tb.fines : []) {
      const amount = Number(f?.amountCents);
      if (!Number.isSafeInteger(amount) || amount <= 0) continue;
      fines.push({
        meetingNo: m.meetingNo,
        date: m.date || '',
        name: String(f.name || (f.memberId ? names.get(f.memberId) : '') || 'A member').slice(0, 80),
        reason: String(f.reason ?? '').slice(0, 120),
        amountCents: amount,
        posted: m.status === 'POSTED',
      });
    }
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: COUNTRY_TIME_ZONE.KE ?? 'Africa/Nairobi' }).format(new Date());
  return groupEarnings(turns, fines, today);
}
